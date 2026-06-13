"""
Database configuration, connection pooling, and Cypher transaction execution management.
Optimized for TrustLedger's product-specific payments and supply chain graph generation.
"""
from neo4j import GraphDatabase
import os
from datetime import datetime, timezone
import math
import time
import logging
from uuid import uuid4
from models.models import IDGenerator

logger = logging.getLogger(__name__)


class GraphService:
    def __init__(self):
        self.driver = None
        uri = os.getenv("NEO4J_URI", "")
        user = os.getenv("NEO4J_USER", "")
        password = os.getenv("NEO4J_PASSWORD", "")

        max_retries = int(os.getenv("NEO4J_CONNECT_RETRIES", 5))
        base_delay = float(os.getenv("NEO4J_BASE_DELAY", 1.0))

        for attempt in range(1, max_retries + 1):
            try:
                self.driver = GraphDatabase.driver(uri, auth=(user, password))
                self.driver.verify_connectivity()
                break
            except Exception as e:
                logger.warning(f"Attempt {attempt} to connect to Neo4j failed: {e}")
                self.driver = None
                if attempt == max_retries:
                    logger.error("Could not verify Neo4j connectivity after retries.")
                    break
                time.sleep(base_delay * (2 ** (attempt - 1)))

    def is_available(self):
        return self.driver is not None

    def get_session(self):
        if not self.driver:
            raise RuntimeError("Neo4j database pool connection not available")
        return self.driver.session()

    def close(self):
        if self.driver:
            self.driver.close()

    # --- USER ACTIONS ---
    def create_user_node(self, user_data: dict) -> str:
        """Registers a supply chain participant node (Merchant, Agent, Supplier)"""
        loc = user_data.get('location', {})
        
        query = """
        MERGE (u:User {id: $id})
        ON CREATE SET u.created_at = $created_at
        SET u.name = $name,
            u.role = $role,
            u.email = $email,
            u.phone_number = $phone_number,
            u.city = $city,
            u.state = $state,
            u.country = $country,
            u.trust_score = $trust_score
        RETURN u.id AS user_id
        """
        
        with self.get_session() as session:
            result = session.execute_write(
                lambda tx: tx.run(
                    query,
                    id=user_data['id'],
                    name=user_data['name'],
                    phone_number=user_data.get('phone_number'),
                    email=user_data['email'],
                    role=user_data['role'],
                    city=loc.get('city'),
                    state=loc.get('state'),
                    country=loc.get('country', "Nigeria"),
                    trust_score=user_data.get('trust_score', 50),
                    created_at=datetime.now(timezone.utc).isoformat()
                ).single()
            )
            if not result:
                raise RuntimeError(f"Failed to upsert User node for ID: {user_data.get('id')}")
            return result["user_id"]

    def update_user_virtual_account(self, user_id: str, account_number: str, bank_name: str) -> str:
        """Saves generated OPay Merchant Virtual account numbers onto the tracking User node"""
        query = """
        MATCH (u:User {id: $user_id})
        SET u.virtual_account = $account_number,
            u.bank_name = $bank_name
        RETURN u.id AS user_id
        """
        
        with self.get_session() as session:
            result = session.execute_write(
                lambda tx: tx.run(
                    query, 
                    user_id=user_id, 
                    account_number=account_number, 
                    bank_name=bank_name
                ).single()
            )
            if not result:
                raise ValueError(f"Update failed: User with ID '{user_id}' does not exist.")
            return result["user_id"]

    # --- INVENTORY & PRODUCT QR MANAGEMENT ---
    def register_product_node(self, merchant_id: str, product_name: str, price: float, description: str) -> dict:
        """Creates a Product asset and attaches it via an edge to the owning Merchant"""
        product_id = IDGenerator.generate_product_id()
        payment_reference = IDGenerator.generate_payment_reference()
        qr_payload = f"opay://pay?merchant={merchant_id}&product={product_id}&ref={payment_reference}&amt={price}"
        
        query = """
        MATCH (m:User {id: $merchant_id})
        CREATE (p:Product {
            id: $product_id,
            name: $product_name,
            price: $price,
            description: $description,
            qr_payload: $qr_payload,
            payment_reference: $payment_reference,
            created_at: $created_at
        })
        CREATE (m)-[:OFFERS_ASSET]->(p)
        RETURN p.id AS confirmed_id
        """
        
        with self.get_session() as session:
            result = session.execute_write(
                lambda tx: tx.run(
                    query,
                    merchant_id=merchant_id,
                    product_id=product_id,
                    product_name=product_name,
                    price=price,
                    description=description,
                    qr_payload=qr_payload,
                    payment_reference=payment_reference,
                    created_at=datetime.now(timezone.utc).isoformat()
                ).single()
            )

            if not result:
                raise ValueError(f"Registration failed: Merchant with ID '{merchant_id}' does not exist.")
            
        return {
            "product_id": product_id,
            "payment_reference": payment_reference,
            "qr_payload": qr_payload
        }

        # --- TRANSACTIONAL LEDGER LOGS & WORKFORCE MATRIX ---
    def log_transaction(self, user_id: str, tx_data: dict) -> int:
        """Logs sales or expense actions, then updates transaction relationships between users"""
        tx_id = f"TL-TX-{uuid4().hex[:12].upper()}"
        recipient_id = f"TL-MID-{tx_data.get('associated_phone', '')}"
        timestamp = tx_data.get('timestamp') or datetime.now(timezone.utc).isoformat()
        
        query = """
        MATCH (u:User {id: $user_id})
        CREATE (t:Transaction {
            id: $tx_id,
            item: $item,
            amount: $amount,
            quantity: $quantity,
            unit: $unit,
            type: $type,
            notes: $notes,
            timestamp: $timestamp,
            opay_order_no: $opay_order_no,
            payment_reference: $payment_reference,
            product_id: $product_id,
            associated_phone: $associated_phone,
            verified: $verified,
            is_anomaly: $is_anomaly,
            fraud_notes: coalesce($fraud_notes, "")
        })
        CREATE (u)-[:PERFORMED]->(t)
        WITH u, t
        
        // Graph Relation Generator: If payment references a Worker or Supplier via phone, link nodes directly
        OPTIONAL MATCH (recipient:User {id: $recipient_id})
        FOREACH (r IN CASE WHEN recipient IS NOT NULL AND $type IN ['SUPPLIER_PAYMENT', 'CASUAL_LABOR_PAYOUT', 'LOGISTICS_DELIVERY'] THEN [recipient] ELSE [] END |
            CREATE (u)-[:SETTLED_SUPPLY_CHAIN_FLOW {amount: $amount, date: $timestamp}]->(r)
        )
        RETURN t.id AS confirmed_tx_id
        """

        with self.get_session() as session:
            # Execute database updates inside a managed write transaction block
            result = session.execute_write(
                lambda tx: tx.run(
                    query,
                    user_id=user_id,
                    recipient_id=recipient_id,
                    tx_id=tx_id,
                    item=tx_data.get('item', 'Market Item'),
                    amount=tx_data.get('amount', 0.0),
                    quantity=tx_data.get('quantity', 1),
                    unit=tx_data.get('unit', 'item'),
                    type=tx_data.get('type', 'SALE'),
                    notes=tx_data.get('notes', 'Logged via TrustLedger Engine'),
                    timestamp=timestamp,
                    opay_order_no=tx_data.get('opay_order_no'),
                    payment_reference=tx_data.get('payment_reference'),
                    product_id=tx_data.get('product_id'),
                    associated_phone=tx_data.get('associated_phone'),
                    verified=tx_data.get('verified', False),
                    is_anomaly=tx_data.get('is_anomaly', False),
                    fraud_notes=tx_data.get('fraud_notes', '')
                ).single()
            )

            # Prevent silent failures if the initial user matching failed
            if not result:
                raise ValueError(f"Transaction log failed: User with ID '{user_id}' does not exist.")

            # Dynamic Network Decayed Score Calculation
            history = session.execute_read(self._get_user_history_nodes, user_id)
            new_score = self.calculate_decayed_score(history)
            
            # Commit recalculated Trust score back into the database
            session.execute_write(self._commit_user_score, user_id, new_score)
            return new_score

    # --- ANTI-FRAUD WEBHOOK VERIFICATION TUNNEL ---
    def verify_transaction_via_webhook(self, reference: str, opay_order_no: str, actual_amount: float) -> dict:
        """
        The platform's primary security check. Bypasses manual entry verification.
        Matches references sent from OPay background hooks, marks transactions as verified,
        and returns the owner identity to feed the real-time WebSocket emitter.
        """
        check_query = """
        MATCH (u:User)-[:PERFORMED]->(t:Transaction {payment_reference: $reference})
        RETURN u.id as merchant_id, t.item as item, t.amount as expected_amount, t.verified as verified
        """
        
        with self.get_session() as session:
            # 1. Fetch transaction properties first to validate state safely using a read transaction
            result = session.execute_read(lambda tx: tx.run(check_query, reference=reference).single())

            if not result:
                return {"status": "not_found", "merchant_id": None, "reason": "Unknown payment reference"}
            
            data = result.data()

            # 2. Idempotency Check
            if data['verified']:
                return {"status": "success", "merchant_id": data['merchant_id'], "item": data['item'], "amount": data['expected_amount'], "note": "Idempotent bypass"}

            # 3. Security Check: Prevent underpayment/overpayment fraud
            if abs(data['expected_amount'] - actual_amount) > 0.01:
                flag_anomaly_query = """
                MATCH (t:Transaction {payment_reference: $reference})
                SET t.is_anomaly = true,
                    t.fraud_notes = $fraud_notes
                """
                session.execute_write(
                    lambda tx: tx.run(
                        flag_anomaly_query, 
                        reference=reference, 
                        fraud_notes=f"Webhook failed: Amount mismatch. Expected {data['expected_amount']}, got {actual_amount}"
                    )
                )
                return {"status": "amount_mismatch", "merchant_id": data['merchant_id'], "reason": "Paid amount does not match ledger record"}
            
            # 4. Safe Verification: Mark transaction clean and save state
            verify_query = """
            MATCH (t:Transaction {payment_reference: $reference})
            SET t.verified = true,
                t.opay_order_no = $opay_order_no,
                t.verified_at = $verified_at,
                t.is_anomaly = false
            """

            session.execute_write(
                lambda tx: tx.run(
                    verify_query,
                    reference=reference,
                    opay_order_no=opay_order_no,
                    verified_at=datetime.now(timezone.utc).isoformat()
                )
            )

            # Recalculate trust metric safely now that amount is verified
            self.recalculate_user_score(data['merchant_id'])
            
            return {
                "status": "success", 
                "merchant_id": data['merchant_id'], 
                "item": data['item'], 
                "amount": data['expected_amount']
            }

        # --- DYNAMIC SCORE ALGORITHMIC MATH ---
    @staticmethod
    def calculate_decayed_score(transactions: list, half_life_days: int = 14) -> int:
        """The core risk metric engine. Weighs fresh server webhooks heavily against memory metrics."""
        if not transactions:
            return 50  # Seed level starting baseline score

        total_weighted_points = 0.0
        
        if half_life_days <= 0:
            lambda_constant = 0.0
        else:
            lambda_constant = math.log(2) / half_life_days
        now = datetime.now(timezone.utc)

        for tx in transactions:
            try:
                tx_time = datetime.fromisoformat(tx['timestamp'])
                if tx_time.tzinfo is None:
                    tx_time = tx_time.replace(tzinfo=timezone.utc)
            except Exception:
                tx_time = now

            days_ago = (now - tx_time).total_seconds() / 86400
            time_decay_weight = math.exp(-lambda_constant * days_ago)

            if tx.get('is_anomaly'):
                base_points = -35.0  # Heavy structural score reduction for price anomaly manipulation
            else:
                # Webhook verified transactions carry 5x higher confidence weight than simple unverified actions
                base_points = 15.0 if tx.get('verified') else 3.0

            total_weighted_points += (base_points * time_decay_weight)

        # Use a symmetric mapping format where 0 points = score of 50.
        # Positive points push up logarithmically toward 100, negative points pull down linearly/logarithmically to 0.
        if total_weighted_points >= 0:
            log_scaled = 50.0 + (math.log(total_weighted_points + 1.0, 1.12))
        else:
            # Mirror down safely without triggering domain math range calculation errors
            log_scaled = 50.0 - (math.log(abs(total_weighted_points) + 1.0, 1.12))

        return min(100, max(0, round(log_scaled)))

    def recalculate_user_score(self, user_id: str) -> int:
        """Orchestrates historical reads and score updates safely through explicit transaction blocks."""
        with self.get_session() as session:
            history = session.execute_read(self._get_user_history_nodes, user_id)
            new_score = self.calculate_decayed_score(history)
            session.execute_write(self._commit_user_score, user_id, new_score)
            return new_score

    # --- MANUAL TRANSACTION UPDATES & AUDITING ---
    def check_if_verified(self, tx_id: str) -> bool:
        """Checks if a transaction has already been locked and verified by an OPay webhook."""
        query = """
        MATCH (t:Transaction {id: $tx_id})
        RETURN coalesce(t.verified, false) as verified
        """
        with self.get_session() as session:
            result = session.execute_read(lambda tx: tx.run(query, tx_id=tx_id).single())
            if not result:
                return False
            return result["verified"]

    def update_transaction_node(self, tx_id: str, tx_data: dict) -> bool:
        """Updates mutable properties of an unverified transaction ledger item."""
        query = """
        MATCH (t:Transaction {id: $tx_id})
        SET t.item = $item,
            t.amount = $amount,
            t.quantity = $quantity,
            t.unit = $unit,
            t.notes = $notes
        RETURN t.id as id
        """
        with self.get_session() as session:
            result = session.execute_write(
                lambda tx: tx.run(
                    query,
                    tx_id=tx_id,
                    item=tx_data.get('item'),
                    amount=tx_data.get('amount'),
                    quantity=tx_data.get('quantity'),
                    unit=tx_data.get('unit'),
                    notes=tx_data.get('notes')
                ).single()
            )
            return result is not None


    # --- DATA UTILITY METHODS ---
    @staticmethod
    def _get_user_history_nodes(tx, user_id: str) -> list:
        query = """
        MATCH (u:User {id: $user_id})-[:PERFORMED]->(t:Transaction)
        RETURN t.amount as amount, t.timestamp as timestamp, t.verified as verified, t.is_anomaly as is_anomaly
        """
        result = tx.run(query, user_id=user_id)
        return [record.data() for record in result]

    @staticmethod
    def _commit_user_score(tx, user_id: str, score: int):
        tx.run("MATCH (u:User {id: $user_id}) SET u.trust_score = $score", user_id=user_id, score=score)

    def get_user_dashboard(self, user_id: str) -> dict:
        """Fetches profile metrics and unified historical interactions to feed the React App state"""
        query = """
            MATCH (u:User {id: $user_id})
            OPTIONAL MATCH (u)-[:PERFORMED]->(t:Transaction)
            WITH u, (CASE WHEN t IS NOT NULL AND coalesce(t.is_anomaly, false) = false THEN t ELSE null END) as t
            ORDER BY t.timestamp DESC
            WITH u, collect(t)[0..10] as short_list
            RETURN u.name as name, 
            coalesce(u.trust_score, 50) as score, 
            u.role as role,
            u.city as city, u.state as state, u.country as country,
            [tx IN short_list WHERE tx IS NOT NULL | {
                item: tx.item,
                amount: tx.amount,
                quantity: coalesce(tx.quantity, 1),
                unit: coalesce(tx.unit, 'item'),
                type: tx.type,
                timestamp: tx.timestamp,
                notes: coalesce(tx.notes, 'No additional notes'),
                opay_order_no: tx.opay_order_no,
                payment_reference: tx.payment_reference,
                product_id: tx.product_id,
                associated_phone: tx.associated_phone,
                verified: coalesce(tx.verified, false),
                is_anomaly: coalesce(tx.is_anomaly, false)
            }] as transactions
        """
        with self.get_session() as session:
            result = session.execute_read(lambda tx: tx.run(query, user_id=user_id).single())
            if not result:
                return {}
                
            data = result.data()
            score = data.get('score', 50)
            
            # Categorize the merchant into their ecosystem reputation band
            if score >= 90: 
                data['tier'] = {"name": "Elite Supplier", "color": "#0EBD2B", "next_milestone": 100}
            elif score >= 75: 
                data['tier'] = {"name": "Established Merchant", "color": "#DDE00D", "next_milestone": 90}
            elif score >= 60: 
                data['tier'] = {"name": "Trusted Tier", "color": "#CE6D11", "next_milestone": 75}
            else: 
                data['tier'] = {"name": "Growing Node", "color": "#9C1908", "next_milestone": 60}
                
            return data

"""
Database configuration, connection pooling, and Cypher transaction execution management.
Optimized for TrustLedger's product-specific payments and supply chain graph generation.
"""
from neo4j import GraphDatabase
import os
from dotenv import load_dotenv
from datetime import datetime, timezone
import math
import time
import logging
from models.models import IDGenerator

logger = logging.getLogger(__name__)
load_dotenv()


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
    def create_user_node(self, user_data: dict):
        """Registers a supply chain participant node (Merchant, Agent, Supplier)"""
        with self.get_session() as session:
            query = """
            MERGE (u:User {id: $id})
            SET u.name = $name,
                u.role = $role,
                u.email = $email,
                u.phone_number = $phone_number,
                u.password = $password,
                u.city = $city,
                u.state = $state,
                u.country = $country,
                u.trust_score = $trust_score,
                u.created_at = $created_at
            RETURN u.id
            """
            loc = user_data.get('location', {})
            session.run(
                query,
                id=user_data['id'],
                name=user_data['name'],
                phone_number=user_data.get('phone_number'),
                email=user_data['email'],
                email=user_data['email'],
                password=user_data['password'],
                role=user_data['role'],
                city=loc.get('city'),
                state=loc.get('state'),
                country=loc.get('country', "Nigeria"),
                trust_score=user_data.get('trust_score', 50),
                created_at=datetime.now(timezone.utc).isoformat()
            )

    def update_user_virtual_account(self, user_id: str, account_number: str, bank_name: str):
        """Saves generated OPay Merchant Virtual account numbers onto the tracking User node"""
        with self.get_session() as session:
            query = """
            MATCH (u:User {id: $user_id})
            SET u.virtual_account = $account_number,
                u.bank_name = $bank_name
            RETURN u.id
            """
            session.run(query, user_id=user_id, account_number=account_number, bank_name=bank_name)

    # --- INVENTORY & PRODUCT QR MANAGEMENT ---
    def register_product_node(self, merchant_id: str, product_name: str, price: float, description: str) -> dict:
        """Creates a Product asset and attaches it via an edge to the owning Merchant"""
        product_id = IDGenerator.generate_product_id()
        payment_reference = IDGenerator.generate_payment_reference()
        
        # Structure the payload string that the UI transforms into a scan card
        qr_payload = f"opay://pay?merchant={merchant_id}&product={product_id}&ref={payment_reference}&amt={price}"
        
        with self.get_session() as session:
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
            RETURN p.id
            """
            session.run(
                query,
                merchant_id=merchant_id,
                product_id=product_id,
                product_name=product_name,
                price=price,
                description=description,
                qr_payload=qr_payload,
                payment_reference=payment_reference,
                created_at=datetime.now(timezone.utc).isoformat()
            )
        
        return {
            "product_id": product_id,
            "payment_reference": payment_reference,
            "qr_payload": qr_payload
        }

    # --- TRANSACTIONAL LEDGER LOGS & WORKFORCE MATRIX ---
    def log_transaction(self, user_id: str, tx_data: dict) -> int:
        """Logs sales or expense actions, then updates transaction relationships between users"""
        tx_id = f"TL-TX-{uuid.uuid4().hex[:12].upper()}"
        timestamp = tx_data.get('timestamp') or datetime.now(timezone.utc).isoformat()
        
        with self.get_session() as session:
            # 1. Store the Transaction properties
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
                is_anomaly: $is_anomaly
            })
            CREATE (u)-[:PERFORMED]->(t)
            WITH u, t
            
            # 2. Graph Relation Generator: If payment references a Worker or Supplier via phone, link the nodes directly
            OPTIONAL MATCH (recipient:User {id: f"TL-MID-" + $associated_phone})
            FOREACH (r IN CASE WHEN recipient IS NOT NULL AND $type IN ['SUPPLIER_PAYMENT', 'CASUAL_LABOR_PAYOUT', 'LOGISTICS_DELIVERY'] THEN [recipient] ELSE [] END |
                CREATE (u)-[:SETTLED_SUPPLY_CHAIN_FLOW {amount: $amount, date: $timestamp}]->(r)
            )
            RETURN t.id
            """
            session.run(
                query,
                user_id=user_id,
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
                is_anomaly=tx_data.get('is_anomaly', False)
            )

            # 3. Dynamic Network Decayed Score Calculation
            history = session.execute_read(self._get_user_history_nodes, user_id)
            new_score = self.calculate_decayed_score(history)
            
            # 4. Commit recalculated Trust score back into the database
            session.execute_write(self._commit_user_score, user_id, new_score)
            return new_score

    # --- ANTI-FRAUD WEBHOOK VERIFICATION TUNNEL ---
    def verify_transaction_via_webhook(self, reference: str, opay_order_no: str, actual_amount: float) -> dict:
        """
        The platform's primary security check. Bypasses manual entry verification.
        Matches references sent from OPay background hooks, marks transactions as verified,
        and returns the owner identity to feed the real-time WebSocket emitter.
        """
        with self.get_session() as session:
            query = """
            MATCH (u:User)-[:PERFORMED]->(t:Transaction {payment_reference: $reference})
            SET t.verified = true,
                t.opay_order_no = $opay_order_no,
                t.verified_at = $verified_at
            RETURN u.id as merchant_id, t.item as item, t.amount as amount
            """
            result = session.run(
                query,
                reference=reference,
                opay_order_no=opay_order_no,
                verified_at=datetime.now(timezone.utc).isoformat()
            ).single()
            
            if result:
                data = result.data()
                # Recalculate merchant score on the fly because a transaction was verified
                self.recalculate_user_score(data['merchant_id'])
                return {"status": "success", "merchant_id": data['merchant_id'], "item": data['item'], "amount": data['amount']}
            return {"status": "not_found", "merchant_id": None}

    # --- DYNAMIC SCORE ALGORITHMIC MATH ---
    @staticmethod
    def calculate_decayed_score(transactions: list, half_life_days: int = 14) -> int:
        """The core risk metric engine. Weighs fresh server webhooks heavily against memory metrics."""
        if not transactions:
            return 50  # Seed level starting baseline score

        total_weighted_points = 0.0
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
                base_points = -25  # Heavy structural score reduction for price anomaly manipulation
            else:
                # Webhook verified transactions carry 5x higher confidence weight than simple unverified voice notes
                base_points = 20 if tx.get('verified') else 4

            total_weighted_points += (base_points * time_decay_weight)

        safe_points = max(total_weighted_points, 0)
        log_scaled = 50 + (math.log(safe_points + 1, 1.15))  # Logarithmic dampening scaling
        return min(100, round(log_scaled))

    def recalculate_user_score(self, user_id: str) -> int:
        with self.get_session() as session:
            history = session.execute_read(self._get_user_history_nodes, user_id)
            new_score = self.calculate_decayed_score(history)
            session.execute_write(self._commit_user_score, user_id, new_score)
            return new_score

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
        with self.get_session() as session:
            query = """
            MATCH (u:User {id: $user_id})
            OPTIONAL MATCH (u)-[:PERFORMED]->(t:Transaction)
            WITH u, t
            ORDER BY t.timestamp DESC
            LIMIT 10
            RETURN u.name as name, 
                   u.trust_score as score, 
                   u.role as role,
                   u.city as city, u.state as state, u.country as country,
                   collect(CASE WHEN t IS NOT NULL THEN {
                       item: t.item,
                       amount: t.amount,
                       type: t.type,
                       verified: t.verified,
                       timestamp: t.timestamp
                   } END) as transactions
            """
            result = session.run(query, user_id=user_id).single()
            if not result:
                return {}
                
            data = result.data()
            score = data['score'] or 50
            
            # Categorize the merchant into their ecosystem reputation band
            if score >= 90: data['tier'] = {"name": "Elite Supplier", "color": "#FFD700", "next_milestone": 100}
            elif score >= 75: data['tier'] = {"name": "Established Merchant", "color": "#C0C0C0", "next_milestone": 90}
            elif score >= 60: data['tier'] = {"name": "Trusted Tier", "color": "#CD7F32", "next_milestone": 75}
            else: data['tier'] = {"name": "Growing Node", "color": "#4CAF50", "next_milestone": 60}
            return data
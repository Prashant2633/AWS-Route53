import asyncio
from sqlalchemy.future import select
from database import engine, Base, AsyncSessionLocal
from models import User, HostedZone, DNSRecord
from routers.auth import get_password_hash

async def seed_data():
    async with engine.begin() as conn:
        print("Creating tables...")
        await conn.run_sync(Base.metadata.create_all)
        print("Tables created.")

    async with AsyncSessionLocal() as session:
        result = await session.execute(select(User).where(User.username == "admin"))
        admin = result.scalars().first()
        
        if not admin:
            print("Seeding admin user...")
            hashed = get_password_hash("password123")
            admin = User(username="admin", password_hash=hashed)
            session.add(admin)
            await session.commit()
            print("Admin user seeded: admin / password123")
        else:
            print("Admin user already exists.")

        zone_check = await session.execute(select(HostedZone))
        if not zone_check.scalars().first():
            print("Seeding sample hosted zones...")
            
            zone1 = HostedZone(
                name="example.com",
                type="Public",
                comment="Primary public domain for staging and production",
                record_count=5
            )
            session.add(zone1)
            await session.flush()
            
            ns1 = DNSRecord(
                zone_id=zone1.id, name="example.com", type="NS", ttl=172800,
                value="ns-1.awsdns-01.com.\nns-2.awsdns-02.org.\nns-3.awsdns-03.net.\nns-4.awsdns-04.co.uk."
            )
            soa1 = DNSRecord(
                zone_id=zone1.id, name="example.com", type="SOA", ttl=900,
                value="ns-1.awsdns-01.com. awsdns-hostmaster.amazon.com. 1 7200 900 1209600 86400"
            )
            a1 = DNSRecord(
                zone_id=zone1.id, name="example.com", type="A", ttl=300,
                value="93.184.216.34", routing_policy="Simple"
            )
            cname1 = DNSRecord(
                zone_id=zone1.id, name="www.example.com", type="CNAME", ttl=300,
                value="example.com", routing_policy="Simple"
            )
            mx1 = DNSRecord(
                zone_id=zone1.id, name="example.com", type="MX", ttl=300,
                value="10 mail.example.com", routing_policy="Simple"
            )
            session.add_all([ns1, soa1, a1, cname1, mx1])

            zone2 = HostedZone(
                name="corp.internal",
                type="Private",
                comment="Internal VPC DNS namespace",
                record_count=3
            )
            session.add(zone2)
            await session.flush()

            ns2 = DNSRecord(
                zone_id=zone2.id, name="corp.internal", type="NS", ttl=172800,
                value="ns-1.awsdns-01.com.\nns-2.awsdns-02.org."
            )
            soa2 = DNSRecord(
                zone_id=zone2.id, name="corp.internal", type="SOA", ttl=900,
                value="ns-1.awsdns-01.com. awsdns-hostmaster.amazon.com. 1 7200 900 1209600 86400"
            )
            a2 = DNSRecord(
                zone_id=zone2.id, name="db.corp.internal", type="A", ttl=60,
                value="10.0.1.5", routing_policy="Simple"
            )
            session.add_all([ns2, soa2, a2])

            await session.commit()
            print("Sample hosted zones and records seeded.")
        else:
            print("Database already contains data.")

if __name__ == "__main__":
    asyncio.run(seed_data())

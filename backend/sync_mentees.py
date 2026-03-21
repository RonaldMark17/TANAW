from app import create_app
from models import db, User, FarmerChild
import re

def slugify(text):
    """Converts a name into a clean, lower-case username format."""
    text = text.lower().strip()
    # Replace spaces and special characters with underscores
    return re.sub(r'[^a-z0-9]', '_', text)

def sync_mentee_accounts():
    app = create_app()
    with app.app_context():
        print("🔄 Initializing Mentee Refresh Protocol...")
        
        # 1. Get all children registered under farmers
        children = FarmerChild.query.all()
        
        if not children:
            print("⚠️ No children found in the 'farmer_children' table.")
            return

        print(f"📂 Found {len(children)} children. Updating database identities...")
        refresh_count = 0

        for child in children:
            # Generate consistent username (e.g., "juan_delacruz_mentee")
            username = f"{slugify(child.name)}_mentee"
            email = f"{username}@agridata.local"
            
            # 2. DELETE IF EXISTS: Look for the old account
            existing_user = User.query.filter_by(username=username).first()
            if existing_user:
                print(f"🗑️ Removing old account: {username}")
                db.session.delete(existing_user)
                # Flush to ensure deletion is processed before adding the new one
                db.session.flush()

            try:
                # 3. CREATE NEW: Initialize the fresh User object
                new_mentee = User(
                    username=username,
                    email=email,
                    full_name=child.name,
                    role='mentee',  
                    is_active=True,
                    otp_enabled=False 
                )
                
                # 4. Set the fresh default password
                new_mentee.set_password("mentee2026")
                
                db.session.add(new_mentee)
                refresh_count += 1
                print(f"✨ Created fresh account: {username}")
                
            except Exception as e:
                print(f"❌ Error refreshing {child.name}: {str(e)}")
                db.session.rollback()

        # 5. Final commit for all changes
        db.session.commit()
        
        print("\n" + "="*40)
        print("✅ DATABASE REFRESH COMPLETE")
        print(f"👥 Total Fresh Mentee Accounts: {refresh_count}")
        print(f"🔐 Default Password for all: mentee2026")
        print("="*40)

if __name__ == '__main__':
    sync_mentee_accounts()
from app import create_app
from models import db, User, FarmerChild
import sqlalchemy

def create_mentee_accounts():
    app = create_app()
    with app.app_context():
        print("🚀 Starting Mentee Account Generation...")
        
        # 1. Fetch all children registered in the system
        children = FarmerChild.query.all()
        accounts_created = 0
        
        if not children:
            print("❌ No children found in the database. Add children to farmers first.")
            return

        for child in children:
            # Create a clean username: lowercase, no spaces + _mentee
            base_username = child.name.lower().replace(" ", "_")
            username = f"{base_username}_mentee"
            email = f"{username}@agridata.local" # Dummy email
            
            # 2. Check if user already exists to avoid duplicates
            existing_user = User.query.filter_by(username=username).first()
            if existing_user:
                print(f"⏩ Skipping: {child.name} (Account already exists)")
                continue

            try:
                # 3. Create the New User
                # Role 'viewer' gives them access to Dashboard and Legacy Portal
                new_user = User(
                    username=username,
                    email=email,
                    full_name=child.name,
                    role='viewer', 
                    is_active=True,
                    otp_enabled=False # Keep it simple for first login
                )
                
                # Default password is 'mentee123'
                new_user.set_password("mentee123")
                
                db.session.add(new_user)
                accounts_created += 1
                print(f"✅ Created: {username}")
                
            except Exception as e:
                print(f"⚠️ Error creating account for {child.name}: {e}")
                db.session.rollback()

        # 4. Commit all changes to the database
        db.session.commit()
        print(f"\n✨ Success! Created {accounts_created} new mentee accounts.")
        print("📝 Default Password for all: mentee123")

if __name__ == '__main__':
    create_mentee_accounts()
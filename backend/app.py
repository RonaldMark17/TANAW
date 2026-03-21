from flask import Flask, request, jsonify, send_file, send_from_directory
from flask_cors import CORS
from flask_jwt_extended import JWTManager, create_access_token, create_refresh_token, jwt_required, get_jwt_identity, get_jwt
from werkzeug.utils import secure_filename
from datetime import datetime, date, timedelta, timezone
import os
import io
import csv
import json
import traceback
from sqlalchemy import or_, func, desc, asc
from flask_mail import Mail, Message
import random
import time

import logging

from pywebpush import webpush, WebPushException

from config import config
from models import (
    db, User, Organization, Barangay, AgriculturalProduct, Farmer, 
    FarmerProduct, FarmerChild, FarmerExperience, ResearchProject,
    SurveyQuestionnaire, ActivityLog, Notification, ExperienceComment,
    TokenBlocklist
)

# --- ADDED: SAFE ML IMPORTS ---
try:
    import joblib
    from tensorflow.keras.models import load_model
    from tensorflow.keras.preprocessing.image import img_to_array
    import numpy as np
    from PIL import Image
    ML_AVAILABLE = True
except ImportError:
    ML_AVAILABLE = False

# Initialize ML Models globally
CROP_CNN_MODEL = None
RISK_RF_MODEL = None

if ML_AVAILABLE:
    try:
        if os.path.exists('crop_model.h5'):
            CROP_CNN_MODEL = load_model('crop_model.h5')
            print("✅ AI Crop Doctor Model Loaded Successfully!")
    except Exception as e:
        print(f"⚠️ Warning: Could not load crop_model.h5. Error: {e}")
        
    try:
        if os.path.exists('risk_model.pkl'):
            RISK_RF_MODEL = joblib.load('risk_model.pkl')
            print("✅ ML Risk Model Loaded Successfully!")
    except Exception as e:
        print(f"⚠️ Warning: Could not load risk_model.pkl. Error: {e}")

# Global OTP storage for password resets
otp_storage = {}

# --- ADDED: MISSING DATABASE MODELS FOR ELDER PORTAL & PUSH NOTIFS ---
class SeasonalLedger(db.Model):
    __tablename__ = 'seasonal_ledgers'
    __table_args__ = {'extend_existing': True}
    id = db.Column(db.Integer, primary_key=True)
    farmer_id = db.Column(db.Integer, db.ForeignKey('farmers.id'), nullable=True)
    farm_size = db.Column(db.Float, default=1.0)
    capital = db.Column(db.Float, default=0.0)
    revenue = db.Column(db.Float, default=0.0)
    profit = db.Column(db.Float, default=0.0)
    issue_tag = db.Column(db.String(100))
    risk_prediction = db.Column(db.String(50))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class CropScan(db.Model):
    __tablename__ = 'crop_scans'
    __table_args__ = {'extend_existing': True}
    id = db.Column(db.Integer, primary_key=True)
    image_path = db.Column(db.String(255), nullable=False)
    ai_diagnosis = db.Column(db.String(100))
    confidence_score = db.Column(db.Float)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class PushSubscription(db.Model):
    __tablename__ = 'push_subscriptions'
    __table_args__ = {'extend_existing': True}
    id = db.Column(db.Integer, primary_key=True)
    subscription_json = db.Column(db.Text, nullable=False)


def create_app(config_name='development'):
    app = Flask(__name__, static_folder="../agridata/dist", static_url_path="/")
    app.config.from_object(config[config_name])
    
    # Define allowed extensions for image upload
    app.config['ALLOWED_EXTENSIONS'] = {'png', 'jpg', 'jpeg', 'gif', 'webp'}
    # Ensure UPLOAD_FOLDER is set
    app.config['UPLOAD_FOLDER'] = os.path.join(app.root_path, 'static', 'uploads')
    
    app.config["JWT_TOKEN_LOCATION"] = ["headers"]
    app.config["JWT_BLACKLIST_ENABLED"] = True
    app.config["JWT_BLACKLIST_TOKEN_CHECKS"] = ["access", "refresh"]

    # Mail configuration
    app.config['MAIL_SERVER'] = 'smtp.gmail.com'
    app.config['MAIL_PORT'] = 587
    app.config['MAIL_USE_TLS'] = True
    app.config['MAIL_USE_SSL'] = False
    app.config['MAIL_USERNAME'] = 'markronald265@gmail.com'
    app.config['MAIL_PASSWORD'] = 'qlfxiqvfyodybpsz'
    app.config['MAIL_DEFAULT_SENDER'] = 'Agridata'

    # Initialize extensions
    db.init_app(app)
    mail = Mail(app)
    
    CORS(app, 
         resources={r"/api/*": {"origins": "*"}}, # Allowing '*' is easiest for ngrok
         supports_credentials=True,
         # MUST INCLUDE "ngrok-skip-browser-warning" in allow_headers
         allow_headers=["Content-Type", "Authorization", "ngrok-skip-browser-warning"],
         methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"])
    
    jwt = JWTManager(app)

    # --- NEW: JWT Blocklist Callbacks for Session Management ---
    # --- UPDATED: Resilient Session Check ---
    @jwt.token_in_blocklist_loader
    def check_if_token_revoked(jwt_header, jwt_payload: dict) -> bool:
        jti = jwt_payload["jti"]
        try:
            # We query the DB for the unique Token ID (jti)
            token = TokenBlocklist.query.filter_by(jti=jti).first()
            return token is not None
        except Exception:
            # If DB is temporarily unreachable during restart, don't kick user out
            return False
        
    @jwt.revoked_token_loader
    def revoked_token_callback(jwt_header, jwt_payload):
        return jsonify(
            {"error": "The session has expired or been terminated. Please log in again."}
        ), 401
    
    # Add this specific handler for Preflight (OPTIONS) requests
    @app.before_request
    def handle_preflight():
        if request.method == "OPTIONS":
            res = jsonify({'status': 'ok'})
            res.headers.add("Access-Control-Allow-Origin", request.headers.get("Origin", "*"))
            res.headers.add("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS")
            # MUST INCLUDE "ngrok-skip-browser-warning" here as well
            res.headers.add("Access-Control-Allow-Headers", "Content-Type,Authorization,ngrok-skip-browser-warning")
            return res, 200
    
    # Create upload folder immediately
    try:
        os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
        print(f"📁 Verified Upload folder at: {app.config['UPLOAD_FOLDER']}")
    except Exception as e:
        print(f"❌ Error creating upload folder: {e}")
    
    VAPID_PUBLIC_KEY = "BMoYQvivahv8gM-gmR0bOv-k0r1uvH8cFxijwpyRos-Y3IgHx7rZ403w0RcML_bAgUsp5_vdUn7zwC5bed9bYQ="
    VAPID_PRIVATE_KEY = "NBaSZ64oTQRF_qSsriChpwvTdKPc3uIRqcTV-zDC2yu="
    VAPID_CLAIMS = {
        "sub": "mailto:markronald265@gmail.com"
    }
    
    # --- HELPER FUNCTIONS ---

    def log_activity(action, entity_type=None, entity_id=None, details=None):
        try:
            user_id = None
            try:
                user_id = get_jwt_identity()
            except:
                pass # Allow system/background logs if no JWT context exists

            if not user_id and request and hasattr(request, 'path') and 'login' not in request.path:
                return 

            # --- REFINEMENT: Clean both Action and Entity Type ---
            formatted_action = action.replace('_', ' ') if action else action
            formatted_entity = entity_type.replace('_', ' ') if entity_type else entity_type

            str_entity_id = str(entity_id) if entity_id else None
            
            log = ActivityLog(
                user_id=user_id,
                action=formatted_action,
                entity_type=formatted_entity, # Cleaned entity type
                entity_id=str_entity_id,
                details=details,
                ip_address=request.remote_addr if request else None
            )
            db.session.add(log)
            
            # --- NEW: AUTOMATED NOTIFICATION GENERATOR ---
            # Fan-out to all active users EXCEPT the user doing the action
            try:
                notif_title = f"{formatted_entity} Update" if formatted_entity else f"System Event: {formatted_action}"
                notif_msg = details if details else f"A new {formatted_action} action was recorded."
                
                active_users = User.query.filter_by(is_active=True).all()
                for u in active_users:
                    # Skip the user who triggered the action!
                    if user_id and str(u.id) == str(user_id):
                        continue
                        
                    auto_notif = Notification(
                        user_id=u.id, 
                        title=notif_title,
                        message=notif_msg,
                        is_read=False,
                        created_at=datetime.utcnow()
                    )
                    db.session.add(auto_notif)
            except Exception as notif_e:
                print(f"Auto-Notif Generation Error: {str(notif_e)}")
            # ---------------------------------------------
            
            db.session.commit()
        except Exception as e:
            print(f"Logging error: {e}")
            db.session.rollback()
            pass

    def broadcast_notification(title, message, target_user_id=None):
        """
        Creates a notification record.
        target_user_id: None for System-Wide (excluding self), or ID for specific user.
        """
        try:
            current_uid = None
            try:
                current_uid = get_jwt_identity()
            except:
                pass

            if target_user_id:
                # Direct message to a specific user (make sure it's not self)
                if str(target_user_id) != str(current_uid):
                    new_alert = Notification(
                        user_id=target_user_id, 
                        title=title,
                        message=message,
                        is_read=False,
                        created_at=datetime.utcnow()
                    )
                    db.session.add(new_alert)
            else:
                # System-wide broadcast: Send to everyone EXCEPT self
                active_users = User.query.filter_by(is_active=True).all()
                for u in active_users:
                    if current_uid and str(u.id) == str(current_uid):
                        continue # DO NOT NOTIFY SELF
                    
                    new_alert = Notification(
                        user_id=u.id, 
                        title=title,
                        message=message,
                        is_read=False,
                        created_at=datetime.utcnow()
                    )
                    db.session.add(new_alert)
                    
            # Note: We let the calling function do the commit to ensure transaction integrity
        except Exception as e:
            print(f"Notification Creation Error: {str(e)}")

    def send_web_push(subscription_info, message_body):
        """Triggers the push message to the browser."""
        try:
            webpush(
                subscription_info=json.loads(subscription_info),
                data=json.dumps(message_body),
                vapid_private_key=VAPID_PRIVATE_KEY,
                vapid_claims=VAPID_CLAIMS
            )
            return True
        except WebPushException as ex:
            print(f"Web Push Error: {ex}")
            # If subscription is expired (410 Gone), delete it from your DB
            return False
    
    def allowed_file(filename):
        return '.' in filename and \
               filename.rsplit('.', 1)[1].lower() in app.config['ALLOWED_EXTENSIONS']
    
    def save_profile_image(file):
        if file and file.filename:
            if allowed_file(file.filename):
                timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
                original_filename = secure_filename(file.filename)
                filename = f"{timestamp}_{original_filename}"
                
                filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
                try:
                    file.save(filepath)
                    print(f"✅ Image saved: {filename} at {filepath}")
                    return filename
                except Exception as e:
                    print(f"❌ Error saving file: {e}")
                    return None
            else:
                print(f"❌ Invalid file type: {file.filename}")
        else:
            print("❌ No file or filename provided")
        return None
    
    def delete_profile_image(filename):
        if filename:
            filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            if os.path.exists(filepath):
                try:
                    os.remove(filepath)
                    print(f"🗑️ Deleted old image: {filename}")
                    return True
                except Exception as e:
                    print(f"Error deleting file {filename}: {e}")
        return False

    # --- ROOT INTERFACE (Status Page) ---
    @app.route('/')
    def index():
        return send_from_directory(app.static_folder, "index.html")
    
    # ============ Static File Serving (Images) ============
    @app.route('/static/uploads/<filename>')
    def uploaded_file(filename):
        return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

    # ============ Authentication Routes ============
    
    @app.route('/api/auth/register', methods=['POST'])
    def register():
        try:
            data = request.get_json()
            
            if User.query.filter_by(username=data['username']).first():
                return jsonify({'error': 'Username already exists'}), 400
            
            if User.query.filter_by(email=data['email']).first():
                return jsonify({'error': 'Email already exists'}), 400
            
            # --- FIXED: New users now start as 'pending' and inactive ---
            user = User(
                username=data['username'],
                email=data['email'],
                full_name=data['full_name'],
                role=data.get('role', 'viewer'),
                organization_id=data.get('organization'),
                status='pending',   # Logic for the "Admin Approval" feature
                is_active=False     # Prevents immediate login
            )
            user.set_password(data['password'])
            
            db.session.add(user)
            db.session.commit()
            log_activity('USER REGISTERED', 'User', user.id, f"New account created: {user.username}")
            
            # Message updated to reflect the approval process
            return jsonify({'message': 'Registration successful. Waiting for admin approval.', 'user': user.to_dict()}), 201
        
        except Exception as e:
            db.session.rollback()
            return jsonify({'error': str(e)}), 500
        
    
    @app.route('/api/auth/login', methods=['POST'])
    def login():
        try:
            data = request.get_json()
            username = data.get('username', '').strip()
            password = data.get('password', '').strip()

            # Robust Case-Insensitive Search
            user = User.query.filter(
                or_(
                    func.lower(User.username) == func.lower(username),
                    func.lower(User.email) == func.lower(username)
                )
            ).first()

            if not user or not user.check_password(password):
                return jsonify({'error': 'Invalid credentials'}), 400

            # --- ADDED: Admin Approval Check ---
            # This triggers the 'isPendingApproval' UI in your React frontend
            if hasattr(user, 'status') and user.status == 'pending':
                return jsonify({'error': 'Account pending approval. Please contact admin.'}), 403

            if not user.is_active:
                return jsonify({'error': 'Account is disabled. Contact admin.'}), 403

            # --- OTP LOGIC START (Untouched) ---
            if user.otp_enabled:
                otp = "".join([str(random.randint(0, 9)) for _ in range(6)])
                
                user.otp_code = otp
                user.otp_expiry = datetime.utcnow() + timedelta(minutes=5)
                db.session.commit() 

                try:
                    print(f"📧 Sending OTP to {user.email}...")
                    print(f"[DEBUG] OTP Code: {otp}") 
                    
                    msg = Message(
                        subject="AgriData Security Code", 
                        recipients=[user.email]
                    )
                    
                    msg.html = f"""
                    <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
                        <h2 style="color: #10b981;">AgriData Login Verification</h2>
                        <p>Your One-Time Password (OTP) is:</p>
                        <h1 style="font-size: 32px; letter-spacing: 5px; background: #f0fdf4; padding: 10px; display: inline-block; border-radius: 8px;">{otp}</h1>
                        <p>This code expires in 5 minutes.</p>
                        <p style="font-size: 12px; color: #888;">If you did not attempt this login, please contact support immediately.</p>
                    </div>
                    """
                    
                    mail.send(msg) 
                    print("✅ Email sent successfully!")
                    
                except Exception as e:
                    print(f"❌ FAILED TO SEND EMAIL: {e}")

                return jsonify({
                    'message': 'OTP sent',
                    'otp_required': True
                }), 200
            # --- OTP LOGIC END ---

            # Normal Login (No OTP)
            access_token = create_access_token(identity=str(user.id), expires_delta=timedelta(hours=12))
            refresh_token = create_refresh_token(identity=str(user.id))
            
            log_activity('LOGIN SUCCESS', 'User', user.id, f"User {user.username} logged in")
            
            return jsonify({
                'message': 'Login successful',
                'access_token': access_token,
                'refresh_token': refresh_token,
                'user': user.to_dict(),
                'otp_required': False
            }), 200

        except Exception as e:
            print(f"❌ LOGIN ERROR: {str(e)}")
            return jsonify({'error': 'Internal Server Error'}), 500
            # --- OTP LOGIC END ---

            # Normal Login (No OTP)
            access_token = create_access_token(identity=str(user.id), expires_delta=timedelta(hours=12))
            refresh_token = create_refresh_token(identity=str(user.id))
            
            log_activity('LOGIN SUCCESS', 'User', user.id, f"User {user.username} logged in")
            
            
            return jsonify({
                'message': 'Login successful',
                'access_token': access_token,
                'refresh_token': refresh_token,
                'user': user.to_dict(),
                'otp_required': False
            }), 200

        except Exception as e:
            print(f"❌ LOGIN ERROR: {str(e)}")
            return jsonify({'error': 'Internal Server Error'}), 500
            
    # --- NEW: SECURE LOGOUT ROUTE ---
    @app.route('/api/auth/logout', methods=['POST'])
    @jwt_required(verify_type=False) 
    def logout():
        try:
            token = get_jwt()
            jti = token["jti"]
            ttype = token["type"]
            
            # Add the token to the blocklist
            db.session.add(TokenBlocklist(jti=jti, created_at=datetime.utcnow()))
            db.session.commit()
            
            # Identify user to log
            current_user_id = get_jwt_identity()
            user = User.query.get(current_user_id)
            if user:
                log_activity('LOGOUT SUCCESS', 'User', user.id, f"User {user.username} successfully terminated session")
                
            return jsonify({"message": f"{ttype.capitalize()} token successfully revoked"}), 200
        except Exception as e:
            print(f"Logout Error: {e}")
            return jsonify({"error": "Failed to terminate session properly"}), 500

    @app.route('/api/auth/verify-otp', methods=['POST'])
    def verify_login_otp():
        try:
            data = request.get_json()
            username = data.get('username', '').strip()
            # Force OTP to string and strip whitespace to prevent type/formatting errors
            otp_input = str(data.get('otp', '')).strip()

            # 1. Find the user
            user = User.query.filter(
                or_(
                    func.lower(User.username) == func.lower(username),
                    func.lower(User.email) == func.lower(username)
                )
            ).first()

            if not user:
                return jsonify({'error': 'User session not found.'}), 404

            # 2. Refresh the user instance to ensure we have the latest DB data (Crucial!)
            db.session.refresh(user)

            # --- DEBUG LOGS (Check your terminal) ---
            print(f"🔍 VERIFYING OTP for {user.username}")
            print(f"   📥 Input: '{otp_input}'")
            print(f"   💾 Stored: '{user.otp_code}'")
            print(f"   🕒 Time Now (UTC): {datetime.utcnow()}")
            print(f"   🛑 Expires (UTC): {user.otp_expiry}")

            # 3. Validation Logic
            if not user.otp_code:
                print("   ❌ FAIL: No OTP stored in DB")
                return jsonify({'error': 'No OTP request found. Please login again.'}), 400

            if user.otp_code != otp_input:
                print("   ❌ FAIL: Code mismatch")
                return jsonify({'error': 'Invalid verification code.'}), 400
            
            if user.otp_expiry and datetime.utcnow() > user.otp_expiry:
                print("   ❌ FAIL: Expired")
                return jsonify({'error': 'Code has expired. Please login again.'}), 400

            print("   ✅ SUCCESS: OTP Valid")
            
            # 4. Success - Clear OTP fields and Issue Tokens
            user.otp_code = None
            user.otp_expiry = None
            db.session.commit()

            access_token = create_access_token(identity=str(user.id), expires_delta=timedelta(hours=12))
            refresh_token = create_refresh_token(identity=str(user.id))
            
            log_activity('LOGIN OTP SUCCESS', 'User', user.id, f"User {user.username} verified OTP")

            return jsonify({
                'message': 'Verification successful',
                'access_token': access_token,
                'refresh_token': refresh_token,
                'user': user.to_dict()
            }), 200

        except Exception as e:
            print(f"❌ VERIFY ERROR: {str(e)}")
            traceback.print_exc()
            return jsonify({'error': 'Internal Server Error during verification'}), 500

    @app.route('/api/auth/toggle-otp', methods=['POST'])
    @jwt_required()
    def toggle_otp():
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        data = request.get_json()
        
        # Ensure we handle boolean values correctly
        enable = data.get('enable')
        if enable is None:
            return jsonify({'error': 'Missing enable parameter'}), 400
            
        user.otp_enabled = bool(enable)
        db.session.commit()

        status = "enabled" if user.otp_enabled else "disabled"
        log_activity('SECURITY UPDATE', 'User', user.id, f"User {status} 2FA/OTP")

        return jsonify({'message': f'Two-factor authentication {status}', 'state': user.otp_enabled}), 200
    
    @app.route('/api/auth/refresh', methods=['POST'])
    @jwt_required(refresh=True)
    def refresh():
        user_id = get_jwt_identity()
        access_token = create_access_token(identity=user_id)
        return jsonify({'access_token': access_token}), 200
    
    @app.route('/api/auth/me', methods=['GET'])
    @jwt_required()
    def get_current_user():
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 404
        return jsonify(user.to_dict()), 200
    
    @app.route('/api/auth/forgot-password', methods=['POST'])
    def request_otp():
        email = request.json.get('email')
        user = User.query.filter_by(email=email).first()
        if not user:
            return jsonify({"error": "This email is not registered in our system handle."}), 404
        
        otp = str(random.randint(100000, 999999))
        otp_storage[email] = {"otp": otp, "timestamp": datetime.now()}
        
        try:
            msg = Message(
                subject="AgriData | Identity Verification Code",
                recipients=[email]
            )
            
            msg.body = f"Identity recovery initiated. Your 6-digit verification code is: {otp}"
            
            msg.html = f"""
            <div style="font-family: 'Inter', sans-serif; background-color: #f8fafc; padding: 40px; color: #0f172a;">
                <div style="max-width: 500px; margin: 0 auto; background: #ffffff; border-radius: 24px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);">
                    <div style="background: #041d18; padding: 30px; text-align: center;">
                        <h1 style="color: #10b981; margin: 0; font-size: 24px; text-transform: uppercase; letter-spacing: 2px; font-weight: 900;">AgriData</h1>
                        <p style="color: #4ade80; margin: 5px 0 0 0; font-size: 10px; text-transform: uppercase; letter-spacing: 3px;">Systems Hub</p>
                    </div>
                    <div style="padding: 40px; text-align: center;">
                        <h2 style="font-size: 20px; font-weight: 800; color: #1e293b; margin-bottom: 8px; text-transform: uppercase;">Identity Verification</h2>
                        <p style="color: #64748b; font-size: 14px; margin-bottom: 30px;">A password reset request was initiated for your account. Use the secure code below to proceed.</p>
                        
                        <div style="background: #f1f5f9; padding: 20px; border-radius: 16px; border: 1px dashed #cbd5e1; margin-bottom: 30px;">
                            <span style="font-family: monospace; font-size: 36px; font-weight: 900; letter-spacing: 8px; color: #041d18;">{otp}</span>
                        </div>
                        
                        <p style="color: #94a3b8; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Expires in 10 minutes</p>
                    </div>
                    <div style="background: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #f1f5f9;">
                        <p style="color: #94a3b8; font-size: 10px; margin: 0;">If you did not request this, please ignore this email or contact system governance.</p>
                    </div>
                </div>
                <p style="text-align: center; color: #cbd5e1; font-size: 10px; margin-top: 20px; text-transform: uppercase; letter-spacing: 1px;">© 2026 Institutional Registry • Secure Automated System</p>
            </div>
            """
            
            mail.send(msg)
            return jsonify({"message": "OTP sent to your Gmail."}), 200
            
        except Exception as e:
            print(f"SMTP ERROR: {str(e)}") 
            return jsonify({"error": "Mail delivery failure. Ensure App Password is valid."}), 500
        
    @app.route('/api/auth/reset-password', methods=['POST'])
    def reset_password():
        data = request.get_json()
        email = data.get('email')
        otp_received = data.get('otp')
        new_password = data.get('new_password')

        if email in otp_storage and otp_storage[email]['otp'] == otp_received:
            user = User.query.filter_by(email=email).first()
            if user:
                user.set_password(new_password)
                db.session.commit()
                del otp_storage[email]
                log_activity('PASSWORD RESET', 'User', user.id, f"Identity recovery completed for {user.email}")
                return jsonify({"message": "Password updated successfully."}), 200
        
        return jsonify({"error": "Invalid or expired verification code."}), 400
    
    @app.route('/api/auth/verify-otp-reset', methods=['POST'])
    def verify_otp():
        data = request.get_json()
        email = data.get('email')
        otp_received = data.get('otp')

        if email in otp_storage:
            stored_otp_data = otp_storage[email]
            if stored_otp_data['otp'] == str(otp_received):
                return jsonify({"message": "Identity verified successfully."}), 200
            else:
                return jsonify({"error": "Invalid verification code. Please check your Gmail."}), 400
        
        return jsonify({"error": "Session expired. Please request a new code."}), 404

    # ============ Dashboard Routes ============
    
    @app.route('/api/dashboard/stats', methods=['GET'])
    @jwt_required()
    def get_dashboard_stats():
        try:
            # 1. Get the Time Filter
            time_range = request.args.get('range', 'all')
            start_date = None
            if time_range == 'month':
                start_date = datetime.utcnow() - timedelta(days=30)
            elif time_range == 'year':
                start_date = datetime.utcnow() - timedelta(days=365)

            # 2. Helper to filter queries by date safely
            def apply_date_filter(query, model):
                if start_date and hasattr(model, 'created_at'):
                    return query.filter(model.created_at >= start_date)
                return query

            # 3. Core Metrics with Null Handling
            total_farmers = apply_date_filter(Farmer.query, Farmer).count()
            total_barangays = Barangay.query.count() or 0
            total_products = AgriculturalProduct.query.count() or 0
            total_experiences = apply_date_filter(FarmerExperience.query, FarmerExperience).count() or 0
            total_projects = apply_date_filter(ResearchProject.query, ResearchProject).count() or 0
            
            # Youth Succession Count
            children_farming = FarmerChild.query.filter_by(continues_farming=True).count() or 0
            total_children = FarmerChild.query.count() or 0
            
            # System Entities
            total_users = User.query.count() or 0
            total_surveys = SurveyQuestionnaire.query.count() or 0

            # 4. Academic Profile Data
            edu_query = db.session.query(Farmer.education_level, func.count(Farmer.id))
            if start_date: 
                edu_query = edu_query.filter(Farmer.created_at >= start_date)
            education_stats_raw = edu_query.group_by(Farmer.education_level).all()
            education_stats = [{'level': (l or "Unknown"), 'count': c} for l, c in education_stats_raw]

            # 5. Territorial Density Data
            prod_stats_query = db.session.query(
                Barangay.name, 
                func.count(Farmer.id)
            ).join(Farmer, Barangay.id == Farmer.barangay_id)
            
            if start_date: 
                prod_stats_query = prod_stats_query.filter(Farmer.created_at >= start_date)
            
            product_stats_raw = prod_stats_query.group_by(Barangay.name).order_by(func.count(Farmer.id).desc()).all()
            product_stats = [{'barangay': n, 'count': c} for n, c in product_stats_raw]

            # 6. EXECUTIVE SUMMARY ANALYSIS
            raw_age = apply_date_filter(db.session.query(func.avg(Farmer.age)), Farmer).scalar() or 0
            raw_income = apply_date_filter(db.session.query(func.avg(Farmer.annual_income)), Farmer).scalar() or 0
            raw_land = apply_date_filter(db.session.query(func.avg(Farmer.farm_size_hectares)), Farmer).scalar() or 0

            top_edu = "N/A"
            if education_stats:
                top_edu = max(education_stats, key=lambda x: x['count'])['level']
            
            top_brgy = "N/A"
            if product_stats:
                top_brgy = max(product_stats, key=lambda x: x['count'])['barangay']

            summary_analysis = {
                "average_farmer_age": round(float(raw_age), 1),
                "average_annual_income": round(float(raw_income), 2),
                "average_land_size_ha": round(float(raw_land), 2),
                "top_education_level": top_edu,
                "most_populated_barangay": top_brgy,
                "total_system_users": total_users,
                "total_active_surveys": total_surveys
            }

            recent_activities = ActivityLog.query.order_by(ActivityLog.created_at.desc()).limit(10).all()

            return jsonify({
                'total_farmers': total_farmers,
                'total_barangays': total_barangays,
                'total_products': total_products,
                'total_experiences': total_experiences,
                'total_projects': total_projects,
                'children_farming': children_farming,
                'total_children': total_children,
                'recent_activities': [log.to_dict() for log in recent_activities],
                'education_stats': education_stats,
                'product_stats': product_stats,
                'summary_analysis': summary_analysis
            }), 200

        except Exception as e:
            print(f"CRITICAL DASHBOARD ERROR: {str(e)}")
            traceback.print_exc()
            return jsonify({
                'error': 'Analytics Engine Error',
                'message': str(e)
            }), 500
    
    # ============ Notification Routes ============
    
    @app.route('/api/notifications', methods=['GET'])
    @jwt_required()
    def get_notifications():
        try:
            current_user_id = get_jwt_identity()
            
            # Fetch ONLY personal notifications assigned to this user
            notifications = Notification.query.filter_by(user_id=current_user_id)\
                .order_by(Notification.created_at.desc()).limit(20).all()
            
            return jsonify([n.to_dict() for n in notifications]), 200
        except Exception as e:
            print(f"Notification Error: {e}")
            return jsonify([]), 200

    @app.route('/api/notifications/<int:id>/read', methods=['PUT'])
    @jwt_required()
    def mark_read(id):
        try:
            current_user_id = get_jwt_identity()
            notif = Notification.query.get_or_404(id)
            if str(notif.user_id) == str(current_user_id):
                notif.is_read = True
                db.session.commit()
            return jsonify({"message": "Read status updated"}), 200
        except Exception as e:
            db.session.rollback()
            return jsonify({"error": str(e)}), 500

    @app.route('/api/notifications/read-all', methods=['PUT'])
    @jwt_required()
    def mark_all_notifications_read():
        try:
            current_user_id = get_jwt_identity()
            
            Notification.query.filter_by(user_id=current_user_id, is_read=False)\
                .update({Notification.is_read: True}, synchronize_session=False)
            
            db.session.commit()
            return jsonify({"message": "All marked as read"}), 200
        except Exception as e:
            db.session.rollback()
            return jsonify({"error": str(e)}), 500

    @app.route('/api/notifications', methods=['DELETE'])
    @jwt_required()
    def clear_notifications():
        try:
            current_user_id = get_jwt_identity()
            
            Notification.query.filter_by(user_id=current_user_id)\
                .delete(synchronize_session=False)
            
            db.session.commit()
            return jsonify({"message": "Registry cleared"}), 200
        except Exception as e:
            db.session.rollback()
            return jsonify({"error": str(e)}), 500

    # ============ Farmer Routes ============

    @app.route('/api/farmers', methods=['GET'])
    @jwt_required()
    def get_farmers():
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', app.config.get('ITEMS_PER_PAGE', 20), type=int)
        search = request.args.get('search', '')
        barangay_id = request.args.get('barangay_id')
        
        sort_by = request.args.get('sort_by', 'created_at')
        sort_order = request.args.get('sort_order', 'desc')
        
        query = Farmer.query
        
        if search:
            search_term = f"%{search}%"
            query = query.filter(
                or_(
                    Farmer.first_name.ilike(search_term),
                    Farmer.last_name.ilike(search_term),
                    Farmer.farmer_code.ilike(search_term)
                )
            )
        
        if barangay_id:
            query = query.filter(Farmer.barangay_id == barangay_id)
        
        if hasattr(Farmer, sort_by):
            col = getattr(Farmer, sort_by)
            if sort_order == 'asc':
                query = query.order_by(col.asc())
            else:
                query = query.order_by(col.desc())
        else:
            query = query.order_by(Farmer.created_at.desc())

        pagination = query.paginate(page=page, per_page=per_page, error_out=False)
        
        return jsonify({
            'farmers': [farmer.to_dict(include_relations=True) for farmer in pagination.items],
            'total': pagination.total,
            'pages': pagination.pages,
            'current_page': page
        }), 200
    
    @app.route('/api/farmers/<int:id>', methods=['GET'])
    @jwt_required()
    def get_farmer(id):
        farmer = Farmer.query.get_or_404(id)
        
        products = FarmerProduct.query.filter_by(farmer_id=id).all()
        children = FarmerChild.query.filter_by(farmer_id=id).all()
        experiences = FarmerExperience.query.filter_by(farmer_id=id).all()
        
        data = farmer.to_dict(include_relations=True)
        data['products'] = [p.to_dict() for p in products]
        data['children'] = [c.to_dict() for c in children]
        data['experiences'] = [e.to_dict() for e in experiences]
        
        return jsonify(data), 200
    
    @app.route('/api/farmers', methods=['POST'])
    @jwt_required()
    def create_farmer():
        current_user = User.query.get(get_jwt_identity())
        if current_user.role not in ['admin', 'researcher', 'data_encoder']:
            return jsonify({'error': 'Unauthorized'}), 403
        
        try:
            data = request.form.to_dict()
            
            def get_val(key, type_cast=None, default=None):
                val = data.get(key)
                if val in ['', 'null', 'undefined', None]: return default
                if type_cast:
                    try: return type_cast(val)
                    except: return default
                return val

            profile_image = save_profile_image(request.files['profile_image']) if 'profile_image' in request.files else None
            
            birth_date_val = None
            age_val = get_val('age', int)

            if data.get('birth_date'):
                try:
                    birth_date_val = datetime.strptime(data['birth_date'][:10], '%Y-%m-%d').date()
                    if age_val is None:
                        today = date.today()
                        age_val = today.year - birth_date_val.year - ((today.month, today.day) < (birth_date_val.month, birth_date_val.day))
                except (ValueError, TypeError):
                    pass

            if age_val is None:
                age_val = 0

            # 1. Create and Save the Farmer
            farmer = Farmer(
                farmer_code=data.get('farmer_code'), 
                first_name=data.get('first_name'), 
                middle_name=get_val('middle_name'),
                last_name=data.get('last_name'), 
                suffix=get_val('extension_name'),
                age=age_val, 
                gender=data.get('gender', 'Male'),
                civil_status=data.get('civil_status', 'Single'),
                profile_image=profile_image, 
                birth_date=birth_date_val, 
                barangay_id=get_val('barangay_id', int),
                organization_id=get_val('organization_id', int), 
                data_encoder_id=current_user.id, 
                address=data.get('address'),
                contact_number=data.get('contact_number'), 
                education_level=data.get('education_level', 'Elementary'),
                annual_income=get_val('annual_income', float), 
                income_source=data.get('income_source'),
                number_of_children=get_val('number_of_children', int, 0),
                children_farming_involvement=data.get('children_farming_involvement') in ['true', True, '1'],
                primary_occupation=data.get('primary_occupation'), 
                secondary_occupation=data.get('secondary_occupation'),
                farm_size_hectares=get_val('farm_size_hectares', float, 0), 
                land_ownership=data.get('land_ownership', 'Owner'),
                years_farming=get_val('years_farming', int)
            )
            db.session.add(farmer)
            db.session.commit()

            # 2. Handle Products
            if data.get('products'):
                try:
                    for p in json.loads(data['products']):
                        if not p.get('product_name'): continue
                        prod = AgriculturalProduct.query.filter(func.lower(AgriculturalProduct.name) == func.lower(p['product_name'].strip())).first()
                        if not prod:
                            prod = AgriculturalProduct(name=p['product_name'].strip(), category=p.get('category', 'Others'))
                            db.session.add(prod)
                            db.session.commit()
                        db.session.add(FarmerProduct(farmer_id=farmer.id, product_id=prod.id, production_volume=p.get('production_volume', 0), unit=p.get('unit', 'kg'), is_primary=p.get('is_primary', False)))
                    db.session.commit()
                except Exception as product_err:
                    print(f"Product processing error: {product_err}")

            # --- 3. NOTIFICATION LOGIC (NEW) ---
            try:
                notification_payload = {
                    "title": "New Farmer Enrolled!",
                    "body": f"{farmer.first_name} {farmer.last_name} was added to the registry.",
                    "url": f"/farmers"
                }
                
                # Fetch all browser subscriptions from your database
                subscriptions = PushSubscription.query.all()
                for sub in subscriptions:
                    # Trigger the send function we built earlier
                    send_web_push(sub.subscription_json, notification_payload)
                    
            except Exception as push_err:
                print(f"Push Notification Error: {push_err}") 
                # We use a separate try/except so that if the notification fails, 
                # the farmer still gets saved successfully.

            log_activity('FARMER CREATED', 'Farmer', farmer.id, f"Created: {farmer.first_name} {farmer.last_name}")
            return jsonify({'message': 'Success', 'farmer': farmer.to_dict()}), 201

        except Exception as e:
            db.session.rollback()
            print(f"CRITICAL ERROR: {e}")
            return jsonify({'error': str(e)}), 400
        
    @app.route('/api/organizations', methods=['POST'])
    @jwt_required()
    def create_organization():
        if User.query.get(get_jwt_identity()).role != 'admin': 
            return jsonify({'error': 'Unauthorized'}), 403
        
        data = request.get_json()
        try:
            org = Organization(
                name=data['name'],
                type=data.get('type', 'Cooperative'),
                description=data.get('description'),
                address=data.get('location') 
            )
            db.session.add(org)
            db.session.commit()
            log_activity('ORGANIZATION CREATED', 'Organization', org.id, f"Registered: {org.name}")
            return jsonify({'message': 'Success', 'organization': org.to_dict()}), 201
        except Exception as e: 
            return jsonify({'error': str(e)}), 400

    @app.route('/api/organizations/<int:id>', methods=['PUT'])
    @jwt_required()
    def update_organization(id):
        if User.query.get(get_jwt_identity()).role != 'admin': 
            return jsonify({'error': 'Unauthorized'}), 403
        
        org = Organization.query.get_or_404(id)
        data = request.get_json()
        try:
            for k, v in data.items():
                if k == 'location': # Handle mapping
                    org.address = v
                elif hasattr(org, k) and k != 'id': 
                    setattr(org, k, v)
            
            db.session.commit()
            return jsonify({'message': 'Updated', 'organization': org.to_dict()}), 200
        except Exception as e: 
            return jsonify({'error': str(e)}), 400

    @app.route('/api/organizations/<int:id>', methods=['DELETE'])
    @jwt_required()
    def delete_organization(id):
        if User.query.get(get_jwt_identity()).role != 'admin': return jsonify({'error': 'Unauthorized'}), 403
        try:
            db.session.delete(Organization.query.get_or_404(id))
            db.session.commit()
            return jsonify({'message': 'Deleted'}), 200
        except: return jsonify({'error': 'Cannot delete active organization'}), 400
    
    @app.route('/api/farmers/<int:id>', methods=['PUT'])
    @jwt_required()
    def update_farmer(id):
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        if current_user.role not in ['admin', 'researcher', 'data_encoder']:
            return jsonify({'error': 'Unauthorized'}), 403
        
        farmer = Farmer.query.get_or_404(id)
        
        try:
            data = request.form.to_dict()

            if 'profile_image' in request.files:
                file = request.files['profile_image']
                new_filename = save_profile_image(file)
                if new_filename:
                    if farmer.profile_image:
                        delete_profile_image(farmer.profile_image)
                    farmer.profile_image = new_filename

            key_mapping = {
                'extension_name': 'suffix' 
            }

            excluded_keys = [
                'id', 'created_at', 'updated_at', 'data_encoder_id', 'profile_image', 
                'products', 'children', 'experiences', 
                'barangay', 'organization', 'data_encoder',
                'full_name'
            ]

            for key, value in data.items():
                db_key = key_mapping.get(key, key)

                if hasattr(farmer, db_key) and db_key not in excluded_keys:
                    
                    if db_key == 'birth_date':
                        if value and value != 'null' and value != '':
                            try:
                                farmer.birth_date = datetime.strptime(value[:10], '%Y-%m-%d').date()
                            except (ValueError, TypeError):
                                pass 
                        else:
                            farmer.birth_date = None
                            
                    elif db_key in ['barangay_id', 'organization_id', 'years_farming', 'number_of_children', 'age']:
                        if value and value != 'null' and value != '':
                            try:
                                setattr(farmer, db_key, int(value))
                            except (ValueError, TypeError):
                                pass
                        else:
                            if db_key not in ['barangay_id', 'age'] or value == '': 
                                setattr(farmer, db_key, None)
                    
                    elif db_key in ['farm_size_hectares', 'annual_income']:
                        if value and value != 'null' and value != '':
                            try:
                                setattr(farmer, db_key, float(value))
                            except (ValueError, TypeError):
                                pass
                        else:
                            setattr(farmer, db_key, None)
                            
                    elif db_key == 'children_farming_involvement':
                        farmer.children_farming_involvement = value in ['true', True, 1, '1']
                    
                    else:
                        setattr(farmer, db_key, value)

            products_json = data.get('products')
            if products_json:
                try:
                    FarmerProduct.query.filter_by(farmer_id=farmer.id).delete()
                    products_list = json.loads(products_json)
                    for prod_data in products_list:
                        if not prod_data.get('product_name'):
                            continue

                        prod_name = prod_data['product_name'].strip()
                        agri_product = AgriculturalProduct.query.filter(
                            func.lower(AgriculturalProduct.name) == func.lower(prod_name)
                        ).first()

                        if not agri_product:
                            agri_product = AgriculturalProduct(name=prod_name, category='Crop')
                            db.session.add(agri_product)
                            db.session.commit()

                        farmer_product = FarmerProduct(
                            farmer_id=farmer.id,
                            product_id=agri_product.id,
                            production_volume=prod_data.get('production_volume', 0),
                            unit=prod_data.get('unit', 'kg'),
                            is_primary=prod_data.get('is_primary', False)
                        )
                        db.session.add(farmer_product)
                        
                except json.JSONDecodeError:
                    print("Error decoding products JSON during update")
            
            db.session.commit()
            
            log_activity('FARMER UPDATED', 'Farmer', farmer.id, f"Updated farmer: {farmer.first_name} {farmer.last_name}")
            
            return jsonify({'message': 'Farmer updated successfully', 'farmer': farmer.to_dict()}), 200
            
        except Exception as e:
            db.session.rollback()
            print(f"❌ UPDATE ERROR: {e}")
            traceback.print_exc()
            return jsonify({'error': f'Failed to update record: {str(e)}'}), 400
    
    @app.route('/api/farmers/<int:id>', methods=['DELETE'])
    @jwt_required()
    def delete_farmer(id):
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        if current_user.role not in ['admin']:
            return jsonify({'error': 'Unauthorized'}), 403
        
        farmer = Farmer.query.get_or_404(id)
        
        FarmerProduct.query.filter_by(farmer_id=id).delete()
        FarmerChild.query.filter_by(farmer_id=id).delete()
        FarmerExperience.query.filter_by(farmer_id=id).delete()
        
        if farmer.profile_image:
            delete_profile_image(farmer.profile_image)
        
        log_activity('FARMER DELETED', 'Farmer', farmer.id, f"Deleted farmer: {farmer.first_name} {farmer.last_name}")
        
        db.session.delete(farmer)
        db.session.commit()
        
        return jsonify({'message': 'Farmer deleted successfully'}), 200
    
    # ============ Survey Questionnaires Routes ============
    
    @app.route('/api/surveys', methods=['GET'])
    @jwt_required()
    def get_surveys():
        surveys = SurveyQuestionnaire.query.order_by(SurveyQuestionnaire.created_at.desc()).all()
        return jsonify([s.to_dict() for s in surveys]), 200
    
    @app.route('/api/surveys', methods=['POST'])
    @jwt_required()
    def create_survey():
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        if current_user.role not in ['admin', 'researcher']:
            return jsonify({'error': 'Unauthorized'}), 403
        
        data = request.get_json()
        
        try:
            survey = SurveyQuestionnaire(
                title=data['title'],
                description=data.get('description'),
                category=data.get('category', 'General'),
                is_active=data.get('is_active', True),
                # FIX: Changed from created_by_id to created_by
                created_by=current_user.id
            )
            db.session.add(survey)
            db.session.commit()
            
            log_activity('SURVEY CREATED', 'Survey Questionnaire', survey.id, f"Created survey: {survey.title}")
            return jsonify({'message': 'Survey created successfully', 'survey': survey.to_dict()}), 201
        except Exception as e:
            db.session.rollback()
            print(f"SURVEY CREATE ERROR: {e}")
            return jsonify({'error': str(e)}), 400

    @app.route('/api/surveys/<int:id>', methods=['PUT'])
    @jwt_required()
    def update_survey(id):
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        if current_user.role not in ['admin', 'researcher']:
            return jsonify({'error': 'Unauthorized'}), 403
        
        survey = SurveyQuestionnaire.query.get_or_404(id)
        data = request.get_json()
        
        try:
            for key, value in data.items():
                # FIX: Exclude 'created_by' from being updated by frontend data
                if hasattr(survey, key) and key not in ['id', 'created_at', 'created_by']:
                    setattr(survey, key, value)
            
            db.session.commit()
            log_activity('SURVEY UPDATED', 'Survey Questionnaire', survey.id, f"Modified protocol: {survey.title}")
            return jsonify({'message': 'Survey updated', 'survey': survey.to_dict()}), 200
        except Exception as e:
            db.session.rollback()
            return jsonify({'error': str(e)}), 400

    @app.route('/api/surveys/<int:id>', methods=['DELETE'])
    @jwt_required()
    def delete_survey(id):
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        if current_user.role not in ['admin']:
            return jsonify({'error': 'Unauthorized'}), 403
        
        try:
            survey = SurveyQuestionnaire.query.get_or_404(id)
            db.session.delete(survey)
            db.session.commit()
            return jsonify({'message': 'Survey deleted'}), 200
        except Exception as e:
            db.session.rollback()
            return jsonify({'error': 'Cannot delete survey (may have responses)'}), 400
    
    # ============ Farmer Products Routes (Standalone) ============
    
    @app.route('/api/farmers/<int:farmer_id>/products', methods=['POST'])
    @jwt_required()
    def add_farmer_product(farmer_id):
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        if current_user.role not in ['admin', 'researcher', 'data_encoder']:
            return jsonify({'error': 'Unauthorized'}), 403
        
        data = request.get_json()
        
        product = FarmerProduct(
            farmer_id=farmer_id,
            product_id=data['product_id'],
            production_volume=data.get('production_volume'),
            unit=data.get('unit'),
            is_primary=data.get('is_primary', False),
            selling_price=data.get('selling_price')
        )
        
        db.session.add(product)
        db.session.commit()
        log_activity('COMMODITY ADDED', 'Farmer', farmer_id, f"Appended new crop yield profile to registry")
        return jsonify({'message': 'Product added successfully', 'product': product.to_dict()}), 201
    
    # ============ Farmer Children Routes ============
    
    @app.route('/api/farmers/<int:farmer_id>/children', methods=['POST'])
    @jwt_required()
    def add_farmer_child(farmer_id):
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        if current_user.role not in ['admin', 'researcher', 'data_encoder']:
            return jsonify({'error': 'Unauthorized'}), 403
        
        data = request.get_json()
        
        child = FarmerChild(
            farmer_id=farmer_id,
            name=data.get('name'),
            age=data.get('age'),
            gender=data.get('gender'),
            education_level=data.get('education_level'),
            continues_farming=data.get('continues_farming', False),
            involvement_level=data.get('involvement_level', 'None'),
            current_occupation=data.get('current_occupation'),
            notes=data.get('notes')
        )
        
        db.session.add(child)
        db.session.commit()
        log_activity('CHILD ADDED', 'Farmer Child', child.id, f"Enrolled lineage for Farmer ID: {farmer_id}")
        return jsonify({'message': 'Child record added successfully', 'child': child.to_dict()}), 201
    
    @app.route('/api/farmers/<int:farmer_id>/children/<int:child_id>', methods=['PUT'])
    @jwt_required()
    def update_farmer_child(farmer_id, child_id):
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        # Security Check
        if current_user.role not in ['admin', 'researcher', 'data_encoder']:
            return jsonify({'error': 'Unauthorized'}), 403
            
        # Verify the child exists and belongs to the specified farmer
        child = FarmerChild.query.filter_by(id=child_id, farmer_id=farmer_id).first()
        
        if not child:
            return jsonify({'error': 'Identity record not found in registry.'}), 404
            
        data = request.get_json()
        
        try:
            # Safely update fields using dict.get() to avoid KeyErrors
            if 'name' in data:
                child.name = data.get('name')
            if 'age' in data:
                # Handle empty strings from frontend input type="number"
                age_val = data.get('age')
                child.age = int(age_val) if age_val else None
            if 'gender' in data:
                child.gender = data.get('gender')
            if 'education_level' in data:
                child.education_level = data.get('education_level')
            if 'current_occupation' in data:
                child.current_occupation = data.get('current_occupation')
            if 'continues_farming' in data:
                child.continues_farming = bool(data.get('continues_farming'))
            if 'involvement_level' in data:
                child.involvement_level = data.get('involvement_level')
            if 'notes' in data:
                child.notes = data.get('notes')
                
            db.session.commit()
            
            # Log the modification
            log_activity('CHILD UPDATED', 'Farmer Child', child.id, f"Updated record for {child.name}")
            
            return jsonify({'message': 'Identity modified successfully', 'child': child.to_dict()}), 200
            
        except ValueError as ve:
            db.session.rollback()
            return jsonify({'error': 'Invalid data format provided (e.g. text in age field)'}), 400
        except Exception as e:
            db.session.rollback()
            print(f"❌ CHILD UPDATE ERROR: {str(e)}")
            return jsonify({'error': 'Database constraint violation or server error.'}), 500
        
    @app.route('/api/farmers/<int:farmer_id>/children/<int:child_id>', methods=['DELETE'])
    @jwt_required()
    def delete_farmer_child(farmer_id, child_id):
        current_user = User.query.get(get_jwt_identity())
        if current_user.role not in ['admin', 'researcher']:
            return jsonify({'error': 'Unauthorized'}), 403
            
        child = FarmerChild.query.filter_by(id=child_id, farmer_id=farmer_id).first_or_404()
        child_name = child.name
        
        db.session.delete(child)
        db.session.commit()
        
        # LOG: Lineage removal
        log_activity('CHILD REMOVED', 'Farmer Child', child_id, f"Revoked succession record for {child_name}")
        
        return jsonify({'message': 'Record deleted'}), 200
    
    # ============ Farmer Experiences Routes ============
    
    # ==========================================
    # --- SECURED: FARMER EXPERIENCES API ---
    # ==========================================

    @app.route('/api/experiences', methods=['GET'])
    @jwt_required()
    def get_experiences():
        # Identify the user from the JWT token
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        page = request.args.get('page', 1, type=int)
        
        # --- CRITICAL FIX: Allow frontend to request up to 500 items ---
        # This is required so the AI Knowledge Base can read the entire history
        per_page = request.args.get('per_page', 20, type=int)
        if per_page > 500:
            per_page = 500
        
        # Base query
        query = FarmerExperience.query

        # PRIVACY FILTER:
        # If user is NOT an admin, they should NOT see "Mentees Only" posts
        # UNLESS they are the one who recorded it (interviewer_id).
        if user and user.role != 'admin':
            query = query.filter(
                or_(
                    FarmerExperience.visibility == 'Public',
                    FarmerExperience.interviewer_id == current_user_id
                )
            )

        pagination = query.order_by(FarmerExperience.created_at.desc()).paginate(
            page=page, per_page=per_page, error_out=False
        )

        return jsonify({
            'experiences': [
                # CRITICAL: current_user_id must be passed here!
                exp.to_dict(include_relations=True, current_user_id=current_user_id) 
                for exp in pagination.items
            ],
            'total': pagination.total,
            'pages': pagination.pages,
            'current_page': page
        }), 200
        
    @app.route('/api/experiences', methods=['POST'])
    @jwt_required()
    def create_experience():
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        # FIXED: Added 'farmer' to the allowed roles list
        if current_user.role not in ['admin', 'researcher', 'data_encoder', 'farmer']:
            return jsonify({'error': 'Unauthorized'}), 403
        
        data = request.get_json()
        
        try:
            experience = FarmerExperience(
                farmer_id=data['farmer_id'],
                experience_type=data['experience_type'],
                title=data['title'],
                description=data['description'],
                date_recorded=datetime.strptime(data['date_recorded'], '%Y-%m-%d').date() if data.get('date_recorded') else date.today(),
                interviewer_id=current_user.id, # Establishes ownership
                location=data.get('location'),
                context=data.get('context'),
                visibility=data.get('visibility', 'Public'), # Captured from frontend
                impact_level=data.get('impact_level'),
                comments_enabled=data.get('comments_enabled', True)
            )
            
            db.session.add(experience)
            
            # --- AUTO-NOTIFICATION TRIGGER ---
            broadcast_notification(
                title="Knowledge Base Update", 
                message=f"New {data['experience_type']} recorded: '{data['title']}'",
                target_user_id=None
            )
            # ---------------------------------

            db.session.commit()
            
            log_activity('EXPERIENCE CREATED', 'Farmer Experience', experience.id)
            
            return jsonify({'message': 'Experience recorded successfully', 'experience': experience.to_dict(include_relations=True, current_user_id=current_user_id)}), 201
        
        except Exception as e:
            db.session.rollback()
            print(f"CREATE EXPERIENCE ERROR: {str(e)}")
            return jsonify({'error': str(e)}), 400
    
    @app.route('/api/experiences/<int:id>', methods=['PUT'])
    @jwt_required()
    def update_experience(id):
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        exp = FarmerExperience.query.get_or_404(id)
        
        # --- CRITICAL FIX: SECURITY CHECK ---
        # Only the original creator (interviewer_id) or an admin can update this post
        if str(exp.interviewer_id) != str(current_user_id) and user.role != 'admin':
            return jsonify({'error': 'Access Denied: You can only modify your own posts.'}), 403
        
        data = request.get_json()
        try:
            # Update fields if they are provided in the request
            if 'title' in data: exp.title = data['title']
            if 'description' in data: exp.description = data['description']
            if 'experience_type' in data: exp.experience_type = data['experience_type']
            if 'visibility' in data: exp.visibility = data['visibility']
            
            # This is where the toggle happens, protected by the security check above
            if 'comments_enabled' in data: exp.comments_enabled = data['comments_enabled']
            
            db.session.commit()
            return jsonify(exp.to_dict(current_user_id=current_user_id)), 200
        except Exception as e:
            db.session.rollback()
            return jsonify({'error': str(e)}), 400
        
    @app.route('/api/experiences/<int:id>', methods=['DELETE'])
    @jwt_required()
    def delete_experience(id):
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        exp = FarmerExperience.query.get_or_404(id)
        
        # SECURITY CHECK: Only owner or admin can delete
        if str(exp.interviewer_id) != str(current_user_id) and user.role != 'admin':
            return jsonify({'error': 'Access Denied: You can only delete your own records.'}), 403
            
        try:
            db.session.delete(exp)
            db.session.commit()
            return jsonify({'message': 'Record permanently removed from archives.'}), 200
        except Exception as e:
            db.session.rollback()
            return jsonify({'error': str(e)}), 500
    


    @app.route('/api/experiences/<int:id>/like', methods=['POST'])
    @jwt_required()
    def toggle_experience_like(id):
        try:
            current_user_id = get_jwt_identity()
            experience = FarmerExperience.query.get_or_404(id)
            user = User.query.get(current_user_id)

            # 1. FAILSAFE: Check if user actually exists in the DB
            if not user:
                return jsonify({"error": "User not found"}), 404

            # 2. Determine User's Name safely for the logger
            # (Falls back to 'Unknown User' if username doesn't exist)
            user_display_name = getattr(user, 'username', getattr(user, 'full_name', 'Unknown User'))

            if user in experience.liked_by:
                # UNLIKE
                experience.liked_by.remove(user)
                
                # If likes_count is a real integer column, decrement it safely
                if hasattr(experience, 'likes_count') and isinstance(experience.likes_count, int):
                    experience.likes_count = max(0, experience.likes_count - 1)

                db.session.commit()
                
                # --- LOG THE UNLIKE ACTION ---
                try:
                    log_activity(
                        'EXPERIENCE UNLIKED', 
                        'FarmerExperience', 
                        experience.id, 
                        f"User {user_display_name} removed 'Helpful' status from: {experience.title}"
                    )
                except Exception as log_err:
                    logging.warning(f"Failed to log unlike activity: {log_err}")

                status = "unliked"
                is_liked = False

            else:
                # LIKE
                experience.liked_by.append(user)
                
                # If likes_count is a real integer column, increment it
                if hasattr(experience, 'likes_count') and isinstance(experience.likes_count, int):
                    experience.likes_count += 1

                db.session.commit()
                
                # --- LOG THE LIKE ACTION ---
                try:
                    log_activity(
                        'EXPERIENCE LIKED', 
                        'FarmerExperience', 
                        experience.id, 
                        f"User {user_display_name} marked as 'Helpful': {experience.title}"
                    )
                except Exception as log_err:
                    logging.warning(f"Failed to log like activity: {log_err}")

                status = "liked"
                is_liked = True

            # Calculate final count safely whether it's a relationship array or an integer column
            final_likes_count = getattr(experience, 'likes_count', len(experience.liked_by))

            return jsonify({
                "status": "success",
                "action": status,
                "likes_count": final_likes_count,
                "is_liked_by_me": is_liked
            }), 200

        except Exception as e:
            # CRITICAL: Rollback the database so it doesn't lock up!
            db.session.rollback()
            
            # Log the EXACT reason it crashed to your terminal
            logging.error(f"FATAL ERROR in toggle_experience_like: {str(e)}")
            
            # Return a clean 500 error to the frontend (Prevents the CORS error!)
            return jsonify({
                "status": "error",
                "error": "Internal Server Error",
                "details": str(e)
            }), 500

    @app.route('/api/experiences/<int:id>/comments', methods=['POST'])
    @jwt_required()
    def add_experience_comment(id):
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        exp = FarmerExperience.query.get_or_404(id)
        
        data = request.get_json()

        if not data or not data.get('text'):
            return jsonify({"error": "Comment text is required"}), 400

        try:
            # Create and save the new comment
            comment = ExperienceComment(
                experience_id=id,
                user_id=user.id,
                text=data.get('text')
            )
            db.session.add(comment)
            db.session.commit()

            # Notify others
            if exp.interviewer_id and str(exp.interviewer_id) != str(user.id):
                broadcast_notification(
                    title="New Insight Comment",
                    message=f"{user.full_name} commented on '{exp.title}'.",
                    target_user_id=exp.interviewer_id
                )

            log_activity('EXPERIENCE COMMENTED', 'FarmerExperience', exp.id, f"{user.username} commented on insight.")

            return jsonify({'message': 'Comment added', 'comment': comment.to_dict(current_user_id=current_user_id)}), 201
            
        except Exception as e:
            db.session.rollback()
            print(f"❌ COMMENT ERROR: {e}")
            return jsonify({"error": "Failed to save comment"}), 500
        
    @app.route('/api/experiences/<int:exp_id>/comments/<int:comment_id>', methods=['PUT'])
    @jwt_required()
    def update_comment_text(exp_id, comment_id):
        current_user_id = get_jwt_identity()
        comment = ExperienceComment.query.filter_by(id=comment_id, experience_id=exp_id).first_or_404()
        
        # Security: Only the author or an admin can edit
        user = User.query.get(current_user_id)
        if str(comment.user_id) != str(current_user_id) and user.role != 'admin':
            return jsonify({'error': 'Unauthorized'}), 403
            
        data = request.get_json()
        if 'text' in data:
            comment.text = data['text']
            db.session.commit()
            return jsonify({'message': 'Comment updated', 'comment': comment.to_dict(current_user_id=current_user_id)}), 200
            
        return jsonify({'error': 'No text provided'}), 400

    # ----------------------------------------------------
    # DELETE COMMENT
    # ----------------------------------------------------
    @app.route('/api/experiences/<int:exp_id>/comments/<int:comment_id>', methods=['DELETE'])
    @jwt_required()
    def delete_comment_text(exp_id, comment_id):
        current_user_id = get_jwt_identity()
        comment = ExperienceComment.query.filter_by(id=comment_id, experience_id=exp_id).first_or_404()
        
        # Security: Only the author or an admin can delete
        user = User.query.get(current_user_id)
        if str(comment.user_id) != str(current_user_id) and user.role != 'admin':
            return jsonify({'error': 'Unauthorized'}), 403
            
        db.session.delete(comment)
        db.session.commit()
        return jsonify({'message': 'Comment deleted'}), 200

    # ----------------------------------------------------
    # LIKE/DISLIKE A COMMENT
    # ----------------------------------------------------
    @app.route('/api/experiences/<int:exp_id>/comments/<int:comment_id>/like', methods=['POST'])
    @jwt_required()
    def toggle_comment_like(exp_id, comment_id):
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        comment = ExperienceComment.query.filter_by(id=comment_id, experience_id=exp_id).first_or_404()
        
        if user in comment.liked_by:
            comment.liked_by.remove(user)
            action = "unliked"
        else:
            comment.liked_by.append(user)
            action = "liked"
            
        db.session.commit()
        return jsonify({
            'status': 'success',
            'action': action,
            'likes_count': len(comment.liked_by),
            'is_liked_by_me': action == 'liked'
        }), 200

    
    # ============ Research Projects Routes ============
    
    @app.route('/api/projects', methods=['GET'])
    @jwt_required()
    def get_projects():
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', app.config.get('ITEMS_PER_PAGE', 20), type=int)
        
        pagination = ResearchProject.query.order_by(ResearchProject.created_at.desc()).paginate(page=page, per_page=per_page, error_out=False)
        
        return jsonify({
            'projects': [proj.to_dict(include_relations=True) for proj in pagination.items],
            'total': pagination.total,
            'pages': pagination.pages,
            'current_page': page
        }), 200
    
    @app.route('/api/projects', methods=['POST'])
    @jwt_required()
    def create_project():
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        if current_user.role not in ['admin', 'researcher']:
            return jsonify({'error': 'Unauthorized'}), 403
        
        data = request.get_json()
        
        project = ResearchProject(
            project_code=data.get('project_code'),
            title=data['title'],
            description=data.get('description'),
            principal_investigator_id=current_user.id,
            organization_id=data.get('organization_id'),
            start_date=datetime.strptime(data['start_date'], '%Y-%m-%d').date() if data.get('start_date') else None,
            end_date=datetime.strptime(data['end_date'], '%Y-%m-%d').date() if data.get('end_date') else None,
            status=data.get('status', 'Planning'),
            research_type=data['research_type'],
            objectives=data.get('objectives'),
            methodology=data.get('methodology'),
            budget=data.get('budget'),
            funding_source=data.get('funding_source')
        )
        
        db.session.add(project)
        
        # --- AUTO-NOTIFICATION TRIGGER ---
        broadcast_notification(
            title="Research Initiative Launched", 
            message=f"Project '{data['title']}' has been initiated by {current_user.full_name}.",
            target_user_id=None
        )
        # ---------------------------------

        db.session.commit()
        
        log_activity('PROJECT CREATED', 'Research Project', project.id, f"Created project: {project.title}")
        
        return jsonify({'message': 'Project created successfully', 'project': project.to_dict()}), 201
    
    # ============ Barangay Routes ============
    
    @app.route('/api/barangays', methods=['GET', 'POST'])
    @jwt_required()
    def manage_barangays():
        if request.method == 'GET':
            barangays = Barangay.query.order_by(Barangay.name).all()
            return jsonify([b.to_dict() for b in barangays]), 200
            
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        if current_user.role not in ['admin', 'data_encoder']: return jsonify({'error': 'Unauthorized'}), 403
        
        data = request.get_json()
        
        # FIX: Ensure latitude and longitude are pulled from frontend data
        barangay = Barangay(
            name=data['name'], 
            municipality=data['municipality'], 
            province=data['province'],
            region=data['region'], 
            population=data.get('population'), 
            total_households=data.get('total_households'),
            agricultural_households=data.get('agricultural_households'),
            latitude=data.get('latitude'),    # <--- ADDED THIS
            longitude=data.get('longitude')   # <--- ADDED THIS
        )
        
        db.session.add(barangay)
        db.session.commit()
        
        log_activity('BARANGAY CREATED', 'Barangay', barangay.id, f"Added territory: {barangay.name}")
        broadcast_notification("Geographic Registry", f"New territory '{barangay.name}' added to mapping.")
        return jsonify({'message': 'Barangay created successfully', 'barangay': barangay.to_dict()}), 201
    
    @app.route('/api/mapping/demographics', methods=['GET'])
    @jwt_required()
    def get_map_demographics():
        try:
            # Safely get all barangays
            barangays = Barangay.query.all()
            map_data = []
            
            # Base coordinates for San Pablo City
            base_lat = 14.0673
            base_lng = 121.3242
            
            for b in barangays:
                farmer_count = Farmer.query.filter_by(barangay_id=b.id).count()
                
                # Safe top product query using SQLite compatible string aggregation
                top_crop_name = "Mixed Crops"
                if farmer_count > 0:
                    try:
                        # Find the most common product for this barangay
                        top_product = db.session.query(
                            AgriculturalProduct.name, 
                            func.count(FarmerProduct.id).label('total')
                        ).join(FarmerProduct, AgriculturalProduct.id == FarmerProduct.product_id)\
                         .join(Farmer, Farmer.id == FarmerProduct.farmer_id)\
                         .filter(Farmer.barangay_id == b.id)\
                         .group_by(AgriculturalProduct.name)\
                         .order_by(desc('total')).first()
                         
                        if top_product:
                            top_crop_name = top_product[0]
                    except:
                        pass 
                
                # Check if lat/lng exist in DB, otherwise generate pseudo-coordinates around San Pablo
                lat = getattr(b, 'latitude', None)
                lng = getattr(b, 'longitude', None)
                
                if not lat or not lng:
                    # Random visual spread for demonstration (within ~5km of center)
                    lat = base_lat + (random.uniform(-0.04, 0.04))
                    lng = base_lng + (random.uniform(-0.04, 0.04))

                if farmer_count > 0:
                    map_data.append({
                        "id": b.id,
                        "name": b.name,
                        "lat": lat,
                        "lng": lng,
                        "farmer_count": farmer_count,
                        "top_product": top_crop_name
                    })
                    
            return jsonify(map_data), 200
        except Exception as e:
            print(f"Mapping Error: {str(e)}")
            traceback.print_exc()
            return jsonify({'error': 'Failed to load map data'}), 500
        
        
    
    @app.route('/api/organizations', methods=['GET'])
    @jwt_required()
    def get_organizations():
        organizations = Organization.query.order_by(Organization.name).all()
        return jsonify([o.to_dict() for o in organizations]), 200
    
    # ============ Products Routes ============
    
    @app.route('/api/products', methods=['GET'])
    @jwt_required()
    def get_products():
        products = AgriculturalProduct.query.order_by(AgriculturalProduct.name).all()
        return jsonify([p.to_dict() for p in products]), 200
    
    @app.route('/api/products', methods=['POST'])
    @jwt_required()
    def create_product():
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        if current_user.role not in ['admin', 'researcher']:
            return jsonify({'error': 'Unauthorized'}), 403
        
        data = request.get_json()
        
        product = AgriculturalProduct(
            name=data['name'],
            category=data['category'],
            description=data.get('description')
        )
        
        db.session.add(product)
        db.session.commit()
        log_activity('PRODUCT CREATED', 'Agricultural Product', product.id, f"Added commodity: {product.name}")
        return jsonify({'message': 'Product created successfully', 'product': product.to_dict()}), 201
    

    @app.route('/api/products/<int:id>', methods=['PUT'])
    @jwt_required()
    def update_product(id):
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        if current_user.role not in ['admin', 'researcher']:
            return jsonify({'error': 'Unauthorized'}), 403
        
        product = AgriculturalProduct.query.get_or_404(id)
        data = request.get_json()
        
        try:
            # Check for duplicate name if name is changing
            if 'name' in data and data['name'] != product.name:
                if AgriculturalProduct.query.filter(func.lower(AgriculturalProduct.name) == func.lower(data['name'])).first():
                    return jsonify({'error': 'Product name already exists'}), 400

            if 'name' in data: product.name = data['name']
            if 'category' in data: product.category = data['category']
            if 'description' in data: product.description = data['description']
            
            db.session.commit()
            return jsonify({'message': 'Product updated successfully', 'product': product.to_dict()}), 200
        except Exception as e:
            db.session.rollback()
            return jsonify({'error': str(e)}), 400

    @app.route('/api/products/<int:id>', methods=['DELETE'])
    @jwt_required()
    def delete_product(id):
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        if current_user.role not in ['admin']:
            return jsonify({'error': 'Unauthorized'}), 403
        
        try:
            product = AgriculturalProduct.query.get_or_404(id)
            db.session.delete(product)
            db.session.commit()
            return jsonify({'message': 'Product deleted successfully'}), 200
        except Exception as e:
            db.session.rollback()
            # This usually happens if the product is used in a Farmer's record
            return jsonify({'error': 'Cannot delete: This commodity is linked to existing farmer records.'}), 400
    
    # ============ Export Routes ============
    
    @app.route('/api/export/farmers', methods=['GET'])
    @jwt_required()
    def export_farmers():
        try:
            farmers = Farmer.query.all()
            
            output = io.StringIO()
            writer = csv.writer(output)
            
            writer.writerow([
                'Farmer Code', 'First Name', 'Last Name', 'Age', 'Gender', 
                'Education', 'Barangay', 'Municipality', 'Province',
                'Annual Income', 'Farm Size (ha)', 'Years Farming'
            ])
            
            for farmer in farmers:
                b_name = farmer.barangay.name if farmer.barangay else ''
                b_muni = farmer.barangay.municipality if farmer.barangay else ''
                b_prov = farmer.barangay.province if farmer.barangay else ''
                
                writer.writerow([
                    farmer.farmer_code or '',
                    farmer.first_name or '',
                    farmer.last_name or '',
                    farmer.age or '',
                    farmer.gender or '',
                    farmer.education_level or '',
                    b_name,
                    b_muni,
                    b_prov,
                    str(farmer.annual_income) if farmer.annual_income else '',
                    str(farmer.farm_size_hectares) if farmer.farm_size_hectares else '',
                    farmer.years_farming or ''
                ])
            
            csv_data = output.getvalue()
            output.close()
            
            byte_output = io.BytesIO(csv_data.encode('utf-8'))
            
            return send_file(
                byte_output,
                mimetype='text/csv',
                as_attachment=True,
                download_name=f'farmers_export_{datetime.now().strftime("%Y%m%d")}.csv'
            )
        except Exception as e:
            print(f"Export Error: {e}")
            return jsonify({'error': 'Failed to generate export file'}), 500
            
    # ============ Users Management Routes ============
    
    @app.route('/api/users', methods=['GET'])
    @jwt_required()
    def get_users():
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        if current_user.role not in ['admin']:
            return jsonify({'error': 'Unauthorized'}), 403
        
        users = User.query.order_by(User.created_at.desc()).all()
        return jsonify([u.to_dict() for u in users]), 200
    
    @app.route('/api/users/<int:id>', methods=['PUT'])
    @jwt_required()
    def update_user(id):
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        if current_user.role not in ['admin']:
            return jsonify({'error': 'Unauthorized'}), 403
        
        user = User.query.get_or_404(id)
        data = request.get_json()
        
        try:
            # Added duplicate checks
            if 'username' in data and data['username'] != user.username:
                if User.query.filter_by(username=data['username']).first():
                    return jsonify({'error': 'Username already taken'}), 400
            
            if 'email' in data and data['email'] != user.email:
                if User.query.filter_by(email=data['email']).first():
                    return jsonify({'error': 'Email already registered'}), 400

            for key, value in data.items():
                if hasattr(user, key) and key not in ['id', 'password_hash', 'created_at', 'password']:
                    setattr(user, key, value)
            
            if 'password' in data and data['password']:
                user.set_password(data['password'])
                
            db.session.commit()
            log_activity('USER UPDATED', 'User', user.id, f"Modified profile/role for {user.username}")
            return jsonify({'message': 'User updated successfully', 'user': user.to_dict()}), 200
        except Exception as e:
            db.session.rollback()
            return jsonify({'error': str(e)}), 400

    @app.route('/api/users/<int:id>', methods=['DELETE'])
    @jwt_required()
    def delete_user(id):
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        # 1. Permission Check
        if not current_user or current_user.role != 'admin':
            return jsonify({'error': 'Unauthorized: Admin privileges required'}), 403
        
        # 2. Self-Deletion Check
        if int(current_user_id) == id:
            return jsonify({'error': 'System Protocol: Cannot delete active admin account'}), 400

        user_to_delete = User.query.get_or_404(id)
        user_name = user_to_delete.username
        
        try:
            # 3. UNLINK RELATED RECORDS
            Farmer.query.filter_by(data_encoder_id=id).update({'data_encoder_id': None})
            FarmerExperience.query.filter_by(interviewer_id=id).update({'interviewer_id': None})
            ResearchProject.query.filter_by(principal_investigator_id=id).update({'principal_investigator_id': None})
            ActivityLog.query.filter_by(user_id=id).update({'user_id': None})

            # 4. Execute Deletion
            db.session.delete(user_to_delete)
            db.session.commit()
            log_activity('USER DELETED', 'User', id, f"Revoked access for {user_name}")
            return jsonify({'message': 'User identity revoked and data unlinked successfully'}), 200
            
        except Exception as e:
            db.session.rollback()
            print(f"❌ DELETE USER ERROR: {str(e)}")
            return jsonify({'error': f'Database Constraint Error: {str(e)}'}), 500
    
    # ============ Activity Logs Routes ============
    
    @app.route('/api/activity-logs', methods=['GET'])
    @jwt_required()
    def get_activity_logs():
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        if current_user.role not in ['admin', 'researcher', 'data_encoder', 'viewer']:
            return jsonify({'error': 'Unauthorized'}), 403
        
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 50, type=int)
        
        pagination = ActivityLog.query.order_by(ActivityLog.created_at.desc()).paginate(page=page, per_page=per_page, error_out=False)
        
        return jsonify({
            'logs': [log.to_dict() for log in pagination.items],
            'total': pagination.total,
            'pages': pagination.pages,
            'current_page': page
        }), 200
        
        
    @app.route('/api/notifications/subscribe', methods=['POST'])
    def subscribe():
        """Endpoint for the browser to send its unique subscription info."""
        subscription_data = request.get_json()
        
        # ADDED: Save to DB
        try:
            sub = PushSubscription(subscription_json=json.dumps(subscription_data))
            db.session.add(sub)
            db.session.commit()
        except Exception as e:
            db.session.rollback()
            print(f"Error saving sub: {e}")
            
        return jsonify({"status": "success", "message": "Subscribed to Web Push"}), 201

    @app.route('/api/notifications/trigger-test', methods=['GET'])
    def trigger_test():
        # 1. Grab the most recent subscription (your phone)
        sub = PushSubscription.query.order_by(PushSubscription.id.desc()).first()
        
        if not sub:
            return "No phone found in database. Go to the website and click Allow first!", 404

        # 2. Define what the notification says
        test_payload = {
            "title": "Backend Alert!",
            "body": "This notification came directly from your Python code!",
            "url": "/dashboard"
        }

        # 3. Call your function
        success = send_web_push(sub.subscription_json, test_payload)
        
        if success:
            return "Check your phone! Signal sent.", 200
        else:
            return "Push failed. Check backend console for errors.", 500
        
        
    @app.route('/api/analytics/predict-risk', methods=['POST'])
    def predict_farm_risk():
        data = request.json
        age = data.get('age', 0)
        has_successors = data.get('children_farming_involvement', False)
        income = data.get('annual_income', 0)
        
        risk_score = 0
        issues = []

        # Heuristic 1: Age
        if age >= 65:
            risk_score += 45
            issues.append("Critical Age Bracket (>65)")
        elif age >= 55:
            risk_score += 25
            issues.append("Aging Farmer")

        # Heuristic 2: Succession
        if not has_successors:
            risk_score += 40
            issues.append("No Successor Identified")
        else:
            risk_score -= 15 # Successors mitigate risk

        # Heuristic 3: Economics
        if income < 50000:
            risk_score += 15
            issues.append("Financial Vulnerability")

        risk_score = max(0, min(100, risk_score))
        
        risk_level = "Low"
        if risk_score > 70:
            risk_level = "High"
        elif risk_score > 40:
            risk_level = "Medium"

        return jsonify({
            "risk_score": risk_score,
            "risk_level": risk_level,
            "identified_issues": issues
        }), 200

    # ==========================================
    # --- ADDED: ELDER PORTAL API ROUTES ---
    # ==========================================
    
    # ==========================================
    # --- SECURED: ELDER PORTAL API ROUTES ---
    # ==========================================
    
    @app.route('/api/elder/pamana', methods=['POST'])
    @jwt_required()
    def save_pamana():
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        # ALLOW ADMINS TO TEST IT TOO
        if current_user.role not in ['farmer', 'admin']:
            return jsonify({'error': 'Unauthorized: Only Farmers can use this portal.'}), 403
        data = request.get_json()

        try:
            new_experience = FarmerExperience(
                title=f"Local {data.get('category', 'Knowledge')}",
                description=data.get('transcript'),
                experience_type=data.get('category'),
                farmer_id=data.get('farmer_id'),
                interviewer_id=current_user_id,
                date_recorded=date.today(),
                impact_level='Medium',
                comments_enabled=True
            )
            db.session.add(new_experience)
            db.session.commit()
            return jsonify({"message": "Knowledge saved successfully!"}), 201
        except Exception as e:
            db.session.rollback()
            return jsonify({"error": str(e)}), 500

    @app.route('/api/elder/doktor', methods=['POST'])
    @jwt_required()
    def doctor_crop():
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        # SECURITY CHECK: Allow Farmers and Admins
        if current_user.role not in ['farmer', 'admin']:
            return jsonify({'error': 'Unauthorized: Only Farmers or Admins can use this portal.'}), 403

        if 'image' not in request.files:
            return jsonify({"error": "No image uploaded"}), 400
        
        image_file = request.files['image']
        if image_file.filename == '':
            return jsonify({"error": "Empty file"}), 400

        # 1. SAVE TO DATABASE & FILESYSTEM
        filename = secure_filename(f"scan_{int(time.time())}_{image_file.filename}")
        os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True) 
        upload_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        image_file.save(upload_path)

        # 2. STRICT REAL ML INFERENCE (CNN)
        # If the model isn't loaded, refuse to guess. No more fake data.
        if not ML_AVAILABLE or CROP_CNN_MODEL is None:
            return jsonify({
                "error": "Real AI Engine Offline. Please install tensorflow and place 'crop_model.h5' in the backend folder."
            }), 503

        try:
            # Prepare image exactly how the neural network expects it
            img = Image.open(upload_path).convert('RGB').resize((224, 224))
            
            # CRITICAL FIX: Do NOT divide by 255.0 here. The model's internal Rescaling layer handles it.
            img_array = img_to_array(img) 
            img_array = np.expand_dims(img_array, axis=0) # Add batch dimension -> (1, 224, 224, 3)

            # Send the image through the neural network
            predictions = CROP_CNN_MODEL.predict(img_array)
            class_idx = np.argmax(predictions[0])
            confidence = float(predictions[0][class_idx]) * 100
            
            # Note: Update these names if your Colab dataset had different class names!
            CLASS_NAMES = ['Bacterial_spot', 'Early_blight', 'Healthy', 'Late_blight', 'Leaf_Mold', 'Tungro_Virus']
            
            # Safely get the predicted class name
            if class_idx < len(CLASS_NAMES):
                predicted_class = CLASS_NAMES[class_idx]
            else:
                predicted_class = f"Unknown Pathogen (Code {class_idx})"

            # Dynamically generate advice based strictly on the AI's vision
            if "Healthy" in predicted_class:
                diagnosis_data = {
                    "name": "Healthy Plant",
                    "sci": "No pathogens detected. Maintain optimal NPK fertilizer ratios.",
                    "trad": "Good harvest ahead. Keep up the regular watering schedule."
                }
                risk_level = "Low"
            elif "Bacterial" in predicted_class:
                diagnosis_data = {
                    "name": predicted_class.replace("_", " "),
                    "sci": "Apply copper-based bactericides. Avoid excessive nitrogen.",
                    "trad": "Remove affected leaves and burn them away from the field to stop the spread."
                }
                risk_level = "High"
            elif "blight" in predicted_class.lower():
                diagnosis_data = {
                    "name": predicted_class.replace("_", " "),
                    "sci": "Apply broad-spectrum fungicides (e.g., Mancozeb).",
                    "trad": "Improve air circulation. Do not water leaves from above, only the soil."
                }
                risk_level = "Critical"
            else:
                diagnosis_data = {
                    "name": predicted_class.replace("_", " "),
                    "sci": "Isolate the plant and monitor progression. Apply general pesticide.",
                    "trad": "Consult your local agricultural extension worker."
                }
                risk_level = "Medium"
                
        except Exception as e:
            print(f"ML Processing Error: {e}")
            return jsonify({"error": f"Failed to analyze image pixels: {str(e)}"}), 500

        # 3. LOG TO DATABASE
        try:
            new_scan = CropScan(image_path=upload_path, ai_diagnosis=diagnosis_data["name"], confidence_score=confidence)
            db.session.add(new_scan)
            db.session.commit()
        except Exception as e:
            db.session.rollback()
            print(f"Failed to log scan to DB: {e}")

        # 4. RETURN REAL RESULT TO REACT
        return jsonify({
            "disease": diagnosis_data["name"],
            "scientific": diagnosis_data["sci"],
            "traditional": diagnosis_data["trad"],
            "risk": risk_level,
            "confidence": f"{confidence:.1f}%"
        }), 200
    @app.route('/api/elder/ledger', methods=['POST'])
    @jwt_required()
    def elder_ledger():
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        # --- FIX: ALLOW ADMINS TO TEST THE LEDGER ---
        if current_user.role not in ['farmer', 'admin']:
            return jsonify({'error': 'Unauthorized: Only Farmers or Admins can use this portal.'}), 403

        data = request.get_json()
        farmer_id = data.get('farmer_id')
        
        # Security check to ensure a farmer identity is actually attached
        if not farmer_id:
            return jsonify({'error': 'Farmer Identity missing. Cannot save to database.'}), 400

        farm_size = float(data.get('size', 1.0))
        capital = float(data.get('puhunan', 0))
        revenue = float(data.get('benta', 0))
        issue = data.get('problema', 'None')
        profit = revenue - capital
        roi = (profit / capital) if capital > 0 else 0

        risk_status = "Stable"
        if ML_AVAILABLE and RISK_RF_MODEL:
            try:
                issue_code = 1 if issue != 'None' else 0
                features = np.array([[profit, roi, farm_size, issue_code]])
                prediction = RISK_RF_MODEL.predict(features)[0] 
                if prediction == 1:
                    risk_status = "Critical Risk"
            except Exception as e:
                pass
        else:
            if profit < 0 and issue != 'None':
                risk_status = "Critical Risk"

        # --- CRITICAL FIX: DATABASE SAVE & ERROR HANDLING ---
        try:
            ledger = SeasonalLedger(
                farmer_id=farmer_id,
                farm_size=farm_size,
                capital=capital,
                revenue=revenue,
                profit=profit,
                issue_tag=issue,
                risk_prediction=risk_status
            )
            db.session.add(ledger)
            db.session.commit()
            
            # Add an Activity Log so Admins can track the submission!
            log_activity(
                'LEDGER RECORDED', 
                'Seasonal Ledger', 
                ledger.id, 
                f"Recorded harvest data. Profit: ₱{profit:,.2f}"
            )
            
        except Exception as e:
            db.session.rollback()
            print(f"Ledger DB Error: {e}")
            # If it fails, actually tell the frontend so it doesn't fake a success!
            return jsonify({"error": f"Database save failed: {str(e)}"}), 500
        
        # --- SEND PUSH NOTIFICATION FOR CRITICAL LOSSES ---
        if risk_status == "Critical Risk":
            try:
                alert_payload = {
                    "title": "🚨 AI Alert: Farm Abandonment Risk",
                    "body": f"A {farm_size} HA farm recorded a loss of ₱{abs(profit):,.2f} due to {issue}. High probability of failure detected.",
                    "url": "/map"
                }
                subs = PushSubscription.query.all()
                for sub in subs:
                    send_web_push(sub.subscription_json, alert_payload)
            except Exception as e:
                pass
                
        return jsonify({
            "message": "Ledger saved successfully to database", 
            "profit": profit, 
            "ml_risk_status": risk_status,
            "ledger_id": ledger.id
        }), 201

    
    # Initialize DB tables if they don't exist
    with app.app_context():
        db.create_all()

    return app

if __name__ == '__main__':
    app = create_app()
    app.run(host='0.0.0.0', port=8080, debug=True)
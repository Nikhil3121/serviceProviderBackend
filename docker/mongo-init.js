// docker/mongo-init.js
// Runs once when the container is first created

db = db.getSiblingDB('service_provider');

// Create application user with least privilege
db.createUser({
  user: 'sp_app',
  pwd: 'change_this_password_in_production',
  roles: [{ role: 'readWrite', db: 'service_provider' }],
});

// Create collections with validators
db.createCollection('users');
db.createCollection('otps');
db.createCollection('contacts');
db.createCollection('projects');

// Create indexes
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ phone: 1 }, { unique: true });
db.users.createIndex({ isDeleted: 1, isActive: 1 });
db.users.createIndex({ createdAt: -1 });

db.otps.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
db.otps.createIndex({ phone: 1, purpose: 1, isUsed: 1 });

db.contacts.createIndex({ status: 1, createdAt: -1 });
db.contacts.createIndex({ email: 1 });

db.projects.createIndex({ slug: 1 }, { unique: true });
db.projects.createIndex({ category: 1, isActive: 1 });
db.projects.createIndex({ isDeleted: 1 });
db.projects.createIndex({ title: 'text', description: 'text', tags: 'text' });

print('✅ MongoDB initialized successfully for service_provider');

const mongoose = require('mongoose');
const crypto = require('crypto');
const argon2 = require('argon2');

const ProviderEnum = ['google', 'github', 'facebook'];

const providerSubSchema = new mongoose.Schema(
  {
    provider: { type: String, enum: ProviderEnum, required: true },
    providerId: { type: String, required: true },
  },
  { _id: false }
);

const authSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      unique: true,
      trim: true,
      lowercase: true,
    },
    username: {
      type: String,
      unique: true,
      trim: true,
      required: [true, 'Username is required'],
      lowercase: true,
    },
    phone: {
      type: String,
    },
    password: {
      type: String,
      trim: true,
      required() {
        return !(this.providers && this.providers.length);
      },
      select: false,
    },
    providers: {
      type: [providerSubSchema],
      default: [],
    },
    role: {
      type: [String],
      enum: ['buyer', 'seller', 'admin', 'user', 'service'], // 'service' is a 'system' or 'machine' role assign to tokens used by other backend services (e.g. your Order, Inventory or Shipping Service)
      default: ['user'],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastActiveAt: {
      type: Date,
      default: Date.now,
    },
    emailVerified: {
      type: Boolean,
      default: false,
    },
    otp: String,
    otpExpires: Date,
    pendingEmail: String,
    emailVerificationToken: String,
    emailVerificationTokenExpiresAt: Date,
    passwordChangedAt: Date,
    passwordResetToken: String,
    passwordResetExpiresAt: {
      type: Date,
      default: () => Date.now() + 3600000, // 1 hour from now
    },
  },
  {
    toJSON: {
      transform(_doc, ret) {
        ret.id = ret._id; // Add `id` field from `_id`
        delete ret._id; // Delete the `_id` field
        delete ret.__v; // Delete the `__v` field
        delete ret.password;
      },
    },
    timestamps: true,
  }
);

authSchema.pre('save', function (next) {
  if (this.role && Array.isArray(this.role)) {
    this.role = this.role.map((role) => role.trim().replace(/,$/, ''));
  }
  next();
});

authSchema.pre('save', async function (next) {
  if (this.isModified('password')) {
    try {
      this.password = await argon2.hash(this.password);
    } catch (error) {
      return next(error);
    }
  }
  next();
});

authSchema.pre('save', async function (next) {
  // Only update the passwordChangedAt field if the password has been changed
  if (!this.isModified('password') || this.isNew) return next();
  // ensures that the token is created after the password has been changed
  this.passwordChangedAt = Date.now() - 1000;
  next();
});

authSchema.pre('save', function (next) {
  if (this.isModified('isActive') || this.isNew) {
    this.lastActiveAt = new Date();
  }
  next();
});

authSchema.methods.comparePassword = async function (candidatePassword) {
  try {
    // if OAuth-only (no password), always fail comparison
    if (!this.password) return false;
    return await argon2.verify(this.password, candidatePassword);
  } catch (error) {
    throw error;
  }
};

authSchema.methods.changePasswordAfter = function (JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(this.passwordChangedAt.getTime() / 1000);
    return JWTTimestamp < changedTimestamp;
  }
  return false;
};

authSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString('hex');

  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  this.passwordResetExpiresAt = Date.now() + 10 * 60 * 1000;
  return resetToken;
};

authSchema.index(
  { email: 1 },
  { unique: true, sparse: true, collation: { locale: 'en', strength: 2 } }
);

authSchema.index(
  { 'providers.provider': 1, 'providers.providerId': 1 },
  { unique: true, sparse: true }
);

authSchema.index(
  { username: 1 },
  { unique: true, collation: { locale: 'en', strength: 2 } }
);
authSchema.index({ username: 'text' });

module.exports = mongoose.model('Auth', authSchema);

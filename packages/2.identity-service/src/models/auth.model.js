const mongoose = require('mongoose');
const crypto = require('crypto');
const argon2 = require('argon2');

const authSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      unique: true,
      trim: true,
      required: [true, 'Email is required'],
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
      required: [true, 'Password is required'],
    },
    role: {
      type: [String],
      enum: ['buyer', 'seller', 'admin', 'user', 'service'], // 'service' is a 'system' or 'machine' role assign to tokens used by other backend services (e.g. your Order, Inventory or Shipping Service)
      default: ['user'],
    },
    googleId: String,
    facebookId: String,
    githubId: String,
    appleId: String,
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
    verifcationTokenExpiresAt: Date,
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

authSchema.index({ username: 'text' });

module.exports = mongoose.model('Auth', authSchema);

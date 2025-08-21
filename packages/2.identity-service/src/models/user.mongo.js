const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    authId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Auth',
      required: [true, 'User is required'],
      unique: true,
    },
    profile: {
      firstname: {
        type: String,
        required: [true, 'First name is required'],
        trim: true,
      },
      lastname: {
        type: String,
        required: [true, 'Last name is required'],
        trim: true,
      },
      avatarids: [
        {
          type: String,
        },
      ],
      bio: {
        type: String,
      },
      preferences: {
        darkMode: { type: Boolean, default: false },
        language: { type: String, default: 'en' },
      },
    },
    isActive: {
      type: Boolean,
      default: true,
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

userSchema.pre(/^find/, function (next) {
  // If the operation is a findOneAndUpdate or similar update, skip the filter.
  if (this.op.startsWith('findOneAndUpdate') || this.op.startsWith('update')) {
    return next();
  }
  this.find({ isActive: { $ne: false } });
  next();
});

module.exports = mongoose.model('User', userSchema);

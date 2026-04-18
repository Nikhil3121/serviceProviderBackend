// src/models/Project.js
const mongoose = require('mongoose');
const slugify = require('slugify');

const projectSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      maxlength: [120, 'Title cannot exceed 120 characters'],
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
      maxlength: [5000, 'Description cannot exceed 5000 characters'],
    },
    shortDescription: {
      type: String,
      trim: true,
      maxlength: [300, 'Short description cannot exceed 300 characters'],
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      trim: true,
    },
    tags: [{ type: String, trim: true, lowercase: true }],
    images: [
      {
        url: { type: String, required: true },
        publicId: { type: String },
        alt: { type: String, default: '' },
        isPrimary: { type: Boolean, default: false },
      },
    ],
    pricing: {
      type: {
        type: String,
        enum: ['fixed', 'hourly', 'monthly', 'custom', 'free'],
        default: 'fixed',
      },
      amount: { type: Number, min: 0, default: 0 },
      currency: { type: String, default: 'INR' },
      label: { type: String, trim: true },
    },
    features: [{ type: String, trim: true }],
    isActive: { type: Boolean, default: true },
    isFeatured: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false, select: false },
    deletedAt: { type: Date, select: false },
    viewCount: { type: Number, default: 0 },
    order: { type: Number, default: 0 },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    metaTitle: { type: String, trim: true },
    metaDescription: { type: String, trim: true },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ── Indexes ────────────────────────────────────────────────────────────────
// NOTE: slug already indexed via unique:true in schema definition
projectSchema.index({ category: 1, isActive: 1 });
projectSchema.index({ isFeatured: 1, isActive: 1 });
projectSchema.index({ isDeleted: 1, isActive: 1 });
projectSchema.index({ createdAt: -1 });
projectSchema.index({ title: 'text', description: 'text', tags: 'text' });

// ── Virtuals ───────────────────────────────────────────────────────────────
projectSchema.virtual('primaryImage').get(function () {
  const primary = this.images.find((img) => img.isPrimary);
  return primary ? primary.url : (this.images[0] || {}).url || '';
});

// ── Pre-save: Auto slug ────────────────────────────────────────────────────
projectSchema.pre('save', async function (next) {
  if (!this.isModified('title')) return next();
  const base = slugify(this.title, { lower: true, strict: true });
  let slug = base;
  let count = 0;
  while (await mongoose.model('Project').exists({ slug, _id: { $ne: this._id } })) {
    count += 1;
    slug = `${base}-${count}`;
  }
  this.slug = slug;
  next();
});

// ── Pre-find: Exclude soft-deleted ────────────────────────────────────────
projectSchema.pre(/^find/, function (next) {
  if (!this.getOptions().includeDeleted) {
    this.where({ isDeleted: { $ne: true } });
  }
  next();
});

const Project = mongoose.model('Project', projectSchema);
module.exports = Project;

class ApiFeatures {
  constructor(mongooseQuery, queryString) {
    this.query = mongooseQuery;
    this.queryString = { ...queryString };
    this._filter = {};
    this.pagination = { page: 1, limit: 100, skip: 0 };
  }
  static normalizeDates(qs) {
    const out = { ...qs };
    if ((qs.startDate || qs.endDate) && !qs.createdAt) {
      out.createdAt = {};
      if (qs.startDate) out.createdAt.gte = qs.startDate;
      if (qs.endDate) out.createdAt.lte = qs.endDate;
      delete out.startDate;
      delete out.endDate;
    }
    return out;
  }
  filter() {
    const queryObj = ApiFeatures.normalizeDates(this.queryString);
    const excludedFields = ['page', 'sort', 'limit', 'fields'];
    excludedFields.forEach((el) => delete queryObj[el]);

    // 1B) Advanced filtering
    let queryStr = JSON.stringify(queryObj);
    queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, (match) => `$${match}`);
    this._filter = JSON.parse(queryStr);

    this.query = this.query.find(this._filter);
    return this;
  }

  sort() {
    if (this.queryString.sort) {
      const sortObj = {};
      for (const part of String(this.queryString.sort).split(',')) {
        if (part.startsWith('-')) sortObj[part.slice(1)] = -1;
        else sortObj[part] = 1;
      }
      this.query = this.query.sort(sortObj);
    } else {
      // default: newest first
      this.query = this.query.sort({ createdAt: -1 });
    }
    return this;
  }

  limitFields() {
    if (this.queryString.fields) {
      const fields = String(this.queryString.fields).split(',').join(' ');
      this.query = this.query.select(fields);
    } else {
      this.query = this.query.select('-__v');
    }
    return this;
  }

  paginate() {
    const page = Math.max(parseInt(this.queryString.page || '1', 10), 1);
    const limit = Math.min(
      1000,
      Math.max(parseInt(this.queryString.limit || '100', 10), 1)
    );
    const skip = (page - 1) * limit;

    this.pagination = { page, limit, skip };
    this.query = this.query.skip(skip).limit(limit);
    return this;
  }
  populate(populateOptions) {
    this.query = this.query.populate(populateOptions);
    return this;
  }
}

module.exports = ApiFeatures;

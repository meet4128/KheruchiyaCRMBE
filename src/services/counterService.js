const Counter = require('../models/Counter');

/**
 * Atomically returns the next value of a named counter. The `$inc` + upsert
 * guarantees two concurrent callers never get the same number — the first call
 * for a name creates the document and returns 1.
 *
 * @param {string} name - Counter _id (e.g. 'inquiryNumber')
 * @returns {Promise<number>} The next sequence value
 */
const getNextSequence = async (name) => {
  const counter = await Counter.findOneAndUpdate(
    { _id: name },
    { $inc: { seq: 1 } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  return counter.seq;
};

module.exports = {
  getNextSequence,
};

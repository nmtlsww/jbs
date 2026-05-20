const test = require('node:test');
const assert = require('node:assert/strict');
const S = require('../js/state.js');

test('formatDate 补零到 YYYY-MM-DD', () => {
  assert.equal(S.formatDate(new Date(2026, 4, 2)), '2026-05-02');
  assert.equal(S.formatDate(new Date(2026, 11, 25)), '2026-12-25');
});

test('formatTime 补零到 HH:MM', () => {
  assert.equal(S.formatTime(new Date(2026, 4, 2, 9, 5)), '09:05');
  assert.equal(S.formatTime(new Date(2026, 4, 2, 21, 45)), '21:45');
});

test('initialState 为 20 次、空记录', () => {
  assert.deepEqual(S.initialState(), { count: 20, records: [] });
});

test('applyUse 次数 -1 并在底部追加一条记录', () => {
  const next = S.applyUse(S.initialState(), new Date(2026, 4, 20, 14, 8));
  assert.equal(next.count, 19);
  assert.deepEqual(next.records, [{ date: '2026-05-20', time: '14:08' }]);
});

test('applyUse 多次调用按顺序追加到底部', () => {
  let s = S.initialState();
  s = S.applyUse(s, new Date(2026, 4, 1, 10, 0));
  s = S.applyUse(s, new Date(2026, 4, 2, 11, 0));
  assert.equal(s.count, 18);
  assert.equal(s.records.length, 2);
  assert.equal(s.records[1].date, '2026-05-02');
});

test('applyUse 在 count 为 0 时不做任何改动', () => {
  const zero = { count: 0, records: [{ date: '2026-05-01', time: '10:00' }] };
  const next = S.applyUse(zero, new Date());
  assert.equal(next.count, 0);
  assert.equal(next.records.length, 1);
});

test('applyUse 不修改入参', () => {
  const s = S.initialState();
  S.applyUse(s, new Date());
  assert.equal(s.count, 20);
  assert.equal(s.records.length, 0);
});

test('serialize/deserialize 往返一致', () => {
  const s = { count: 27, records: [{ date: '2026-05-20', time: '09:00' }] };
  assert.deepEqual(S.deserialize(S.serialize(s)), s);
});

test('deserialize 对坏输入回退到 initialState', () => {
  assert.deepEqual(S.deserialize(null), { count: 20, records: [] });
  assert.deepEqual(S.deserialize('not json'), { count: 20, records: [] });
  assert.deepEqual(S.deserialize('{"count":"x"}'), { count: 20, records: [] });
});

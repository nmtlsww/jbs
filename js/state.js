(function (root, factory) {
  var api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.CardState = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var MAX_USES = 20;
  var STORAGE_KEY = 'script_kill_card_state';

  function pad2(n) { return String(n).padStart(2, '0'); }

  function formatDate(d) {
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
  }

  function formatTime(d) {
    return pad2(d.getHours()) + ':' + pad2(d.getMinutes());
  }

  function initialState() {
    return { count: MAX_USES, records: [] };
  }

  function applyUse(state, now) {
    if (state.count <= 0) return state;
    return {
      count: state.count - 1,
      records: state.records.concat([{ date: formatDate(now), time: formatTime(now) }])
    };
  }

  function serialize(state) {
    return JSON.stringify({ count: state.count, records: state.records });
  }

  function deserialize(json) {
    try {
      var s = JSON.parse(json);
      if (s && typeof s.count === 'number' && Array.isArray(s.records)) {
        return { count: s.count, records: s.records };
      }
    } catch (e) { /* 落到下面回退 */ }
    return initialState();
  }

  return {
    MAX_USES: MAX_USES, STORAGE_KEY: STORAGE_KEY,
    pad2: pad2, formatDate: formatDate, formatTime: formatTime,
    initialState: initialState, applyUse: applyUse,
    serialize: serialize, deserialize: deserialize
  };
});

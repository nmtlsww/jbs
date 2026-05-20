(function () {
  'use strict';

  var S = window.CardState;
  var countEl = document.getElementById('count');
  var recordsEl = document.getElementById('records');
  var useBtn = document.getElementById('useBtn');

  var state = S.deserialize(localStorage.getItem(S.STORAGE_KEY));

  function save() {
    localStorage.setItem(S.STORAGE_KEY, S.serialize(state));
  }

  function renderCount() {
    countEl.textContent = String(state.count);
  }

  function renderRecords() {
    recordsEl.textContent = '';
    state.records.forEach(function (rec) {
      var row = document.createElement('div');
      row.className = 'record-row';

      var icon = document.createElement('img');
      icon.className = 'r-icon';
      icon.src = 'assets/icon-record.png';
      icon.alt = '';

      var date = document.createElement('span');
      date.className = 'r-date';
      date.textContent = rec.date;

      var time = document.createElement('span');
      time.className = 'r-time';
      time.textContent = rec.time;

      row.appendChild(icon);
      row.appendChild(date);
      row.appendChild(time);
      recordsEl.appendChild(row);
    });
    recordsEl.scrollTop = recordsEl.scrollHeight;
  }

  function renderButton() {
    useBtn.disabled = state.count <= 0;
  }

  function render() {
    renderCount();
    renderRecords();
    renderButton();
  }

  useBtn.addEventListener('click', function () {
    if (state.count <= 0) return;
    state = S.applyUse(state, new Date());
    save();
    render();
  });

  render();
})();

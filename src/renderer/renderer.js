const $ = (id) => document.getElementById(id);

const el = {
  text: $('text'), counter: $('counter'),
  colorDark: $('colorDark'), colorDarkVal: $('colorDarkVal'),
  colorLight: $('colorLight'), colorLightVal: $('colorLightVal'),
  levelGroup: $('levelGroup'),
  size: $('size'), sizeVal: $('sizeVal'),
  pickLogo: $('pickLogo'), clearLogo: $('clearLogo'), logoInfo: $('logoInfo'),
  logoRatio: $('logoRatio'), logoRatioVal: $('logoRatioVal'),
  generate: $('generate'), save: $('save'), reset: $('reset'),
  stage: $('stage'), preview: $('preview'), placeholder: $('placeholder'),
  meta: $('meta'), metaSize: $('metaSize'), metaLevel: $('metaLevel'), metaLogo: $('metaLogo'),
  status: $('status'),
  wcMin: $('wcMin'), wcMax: $('wcMax'), wcClose: $('wcClose')
};

const MAX = 2000;
let level = 'M';
let logoPath = null;
let fresh = false;

const status = (msg, type = 'info') => {
  if (!msg) { el.status.hidden = true; return; }
  el.status.hidden = false;
  el.status.className = `status ${type}`;
  el.status.textContent = msg;
};

const valid = () => {
  const t = el.text.value.trim();
  if (!t) return 'Введите текст для QR-кода';
  if (t.length > MAX) return 'Текст слишком длинный для QR-кода';
  return null;
};

const refreshButtons = () => {
  el.generate.disabled = !!valid();
  el.save.disabled = !fresh;
};

const payload = (extra = {}) => ({
  text: el.text.value,
  size: Number(el.size.value),
  errorCorrectionLevel: level,
  colorDark: el.colorDark.value,
  colorLight: el.colorLight.value,
  logoPath,
  logoRatio: Number(el.logoRatio.value) / 100,
  ...extra
});

const markDirty = () => { fresh = false; refreshButtons(); };

const syncMeta = () => {
  el.metaSize.textContent = `${el.size.value} px`;
  el.metaLevel.textContent = level;
  el.metaLogo.textContent = logoPath ? `${el.logoRatio.value}%` : 'нет';
};

el.wcMin.onclick = () => window.api.winMin();
el.wcMax.onclick = () => window.api.winMax();
el.wcClose.onclick = () => window.api.winClose();

el.levelGroup.querySelectorAll('.seg').forEach((btn) => {
  btn.onclick = () => {
    el.levelGroup.querySelectorAll('.seg').forEach((b) => b.classList.toggle('is-active', b === btn));
    level = btn.dataset.value;
    markDirty(); syncMeta();
  };
});

const syncColor = (inp, lbl) => { lbl.textContent = inp.value.toLowerCase(); };
el.colorDark.oninput = () => { syncColor(el.colorDark, el.colorDarkVal); markDirty(); };
el.colorLight.oninput = () => { syncColor(el.colorLight, el.colorLightVal); markDirty(); };

el.text.oninput = () => {
  const n = el.text.value.length;
  el.counter.textContent = `${n} / ${MAX}`;
  el.counter.classList.toggle('over', n > MAX);
  refreshButtons();
};

el.size.oninput = () => { el.sizeVal.textContent = `${el.size.value} px`; markDirty(); syncMeta(); };
el.logoRatio.oninput = () => { el.logoRatioVal.textContent = `${el.logoRatio.value} %`; markDirty(); syncMeta(); };

el.generate.onclick = async () => {
  const err = valid();
  if (err) { status(err, 'error'); return; }
  status('Генерация…', 'info');
  el.generate.disabled = true;
  const r = await window.api.generate(payload());
  if (!r.ok) { status(r.error, 'error'); refreshButtons(); return; }
  el.preview.src = r.dataUrl;
  el.preview.hidden = false;
  el.placeholder.style.display = 'none';
  fresh = true;
  status('QR-код успешно сгенерирован', 'success');
  el.meta.hidden = false;
  syncMeta();
  refreshButtons();
};

el.save.onclick = async () => {
  if (!fresh) { status('Сначала сгенерируйте QR-код', 'error'); return; }
  const filePath = await window.api.pickSavePath('qr-code.png');
  if (!filePath) return;
  status('Сохранение…', 'info');
  const r = await window.api.save(payload({ filePath }));
  status(r.ok ? `QR-код сохранён: ${r.filePath}` : r.error, r.ok ? 'success' : 'error');
};

el.pickLogo.onclick = async () => {
  const r = await window.api.pickLogo();
  if (!r) return;
  if (!r.ok) { status(r.error, 'error'); return; }
  logoPath = r.path;
  el.logoInfo.hidden = false;
  el.logoInfo.textContent = `Логотип: ${r.path}`;
  el.clearLogo.disabled = false;
  markDirty(); syncMeta();
  status('Логотип загружен. Нажмите «Сгенерировать».', 'success');
};

el.clearLogo.onclick = () => {
  logoPath = null;
  el.logoInfo.hidden = true;
  el.clearLogo.disabled = true;
  markDirty(); syncMeta();
  status('Логотип убран', 'info');
};

el.reset.onclick = () => {
  el.text.value = '';
  logoPath = null; fresh = false;
  el.preview.hidden = true; el.preview.removeAttribute('src');
  el.placeholder.style.display = '';
  el.logoInfo.hidden = true;
  el.clearLogo.disabled = true;
  el.colorDark.value = '#000000'; el.colorLight.value = '#ffffff';
  syncColor(el.colorDark, el.colorDarkVal);
  syncColor(el.colorLight, el.colorLightVal);
  level = 'M';
  el.levelGroup.querySelectorAll('.seg').forEach((b) => b.classList.toggle('is-active', b.dataset.value === 'M'));
  el.size.value = 400; el.sizeVal.textContent = '400 px';
  el.logoRatio.value = 20; el.logoRatioVal.textContent = '20 %';
  el.meta.hidden = true;
  el.counter.textContent = `0 / ${MAX}`;
  el.counter.classList.remove('over');
  status('');
  refreshButtons();
};

syncColor(el.colorDark, el.colorDarkVal);
syncColor(el.colorLight, el.colorLightVal);
syncMeta();
refreshButtons();
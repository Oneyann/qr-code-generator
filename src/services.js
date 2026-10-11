const QRCode = require('qrcode');
const sharp = require('sharp');
const fs = require('fs/promises');
const path = require('path');

const MAX_TEXT = 2000;
const SIZE_MIN = 200;
const SIZE_MAX = 1000;

class AppError extends Error {
  constructor(message, code = 'ERROR') {
    super(message);
    this.code = code;
  }
}

function validate({ text, size, errorCorrectionLevel, colorDark, colorLight }) {
  if (!text || !text.trim()) throw new AppError('Введите текст для QR-кода', 'EMPTY_TEXT');
  if (text.length > MAX_TEXT) throw new AppError(`Текст слишком длинный (максимум ${MAX_TEXT} символов)`, 'TEXT_TOO_LONG');
  if (!Number(size) || size < SIZE_MIN || size > SIZE_MAX) throw new AppError(`Размер должен быть от ${SIZE_MIN} до ${SIZE_MAX} px`, 'BAD_SIZE');
  if (!['L', 'M', 'Q', 'H'].includes(errorCorrectionLevel)) throw new AppError('Уровень коррекции: L, M, Q или H', 'BAD_LEVEL');
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;
  if (!hex.test(colorDark) || !hex.test(colorLight)) throw new AppError('Некорректный цвет', 'BAD_COLOR');
}

async function generateQr(opts) {
  validate(opts);
  return QRCode.toBuffer(opts.text, {
    type: 'png',
    width: opts.size,
    margin: 2,
    errorCorrectionLevel: opts.errorCorrectionLevel,
    color: { dark: opts.colorDark, light: opts.colorLight }
  });
}

async function addLogo(qrBuffer, logoPath, logoRatio = 0.2) {
  if (!logoPath) return qrBuffer;
  if (logoRatio < 0.02 || logoRatio > 0.5) throw new AppError('Размер логотипа должен быть 2–50%', 'BAD_RATIO');

  try {
    await sharp(logoPath).metadata();
  } catch {
    throw new AppError('Некорректный файл логотипа', 'INVALID_LOGO');
  }

  const meta = await sharp(qrBuffer).metadata();
  const side = Math.min(meta.width, meta.height);
  const logoSize = Math.max(8, Math.round(side * logoRatio));
  const pad = Math.round(logoSize * 0.1);
  const boxSize = logoSize + pad * 2;

  const logo = await sharp(logoPath)
    .resize(logoSize, logoSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png().toBuffer();

  const bg = await sharp({
    create: { width: boxSize, height: boxSize, channels: 4, background: '#ffffff' }
  }).png().toBuffer();

  const composed = await sharp(bg)
    .composite([{ input: logo, gravity: 'center' }])
    .png().toBuffer();

  return sharp(qrBuffer)
    .composite([{
      input: composed,
      left: Math.round((meta.width - boxSize) / 2),
      top: Math.round((meta.height - boxSize) / 2)
    }])
    .png().toBuffer();
}

async function saveFile(buffer, filePath) {
  if (!filePath) throw new AppError('Не указан путь для сохранения', 'BAD_PATH');
  const dir = path.dirname(filePath);
  try {
    await fs.access(dir);
  } catch {
    throw new AppError(`Папка не существует или недоступна: ${dir}`, 'PATH_NOT_FOUND');
  }
  try {
    await fs.writeFile(filePath, buffer);
  } catch (err) {
    throw new AppError(`Не удалось сохранить: ${err.message}`, 'WRITE_ERROR');
  }
  return filePath;
}

async function validateLogo(logoPath) {
  try {
    await sharp(logoPath).metadata();
    return true;
  } catch {
    throw new AppError('Некорректный файл логотипа', 'INVALID_LOGO');
  }
}

module.exports = { generateQr, addLogo, saveFile, validateLogo, AppError, MAX_TEXT };
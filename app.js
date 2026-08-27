/* ============================================================
 * 个性二维码生成器 · 引流神器
 * 纯前端实现，依赖 qrcode.js + html2canvas (CDN)
 * ============================================================ */

(function () {
  'use strict';

  /* ---------- 内置默认配置（config.json 加载失败时兜底） ---------- */
  const DEFAULT_CONFIG = {
    site: { title: '个性二维码生成器', subtitle: '引流神器 · 一键生成精美海报' },
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=JoJoQR&backgroundColor=b6e3f4',
    moreTools: {
      name: '更多工具',
      url: 'https://example.com/tools'
    },
    help: {
      name: '帮助',
      title: '使用帮助',
      content: '1. 在左侧输入网址或文本内容，实时生成二维码。\n2. 可自定义前景色、背景色、码点样式和中心 Logo。\n3. 选择海报模板风格，搭配顶部/底部标题和引导副标题。\n4. 点击「下载二维码方图」获取纯二维码图片，支持透明背景。\n5. 点击「下载高清二维码海报」获取带文案的完整海报。'
    },
    disclaimer: {
      enabled: true,
      title: '声明',
      intro: '本站仅提供转换功能',
      rules: [
        '不要使用生成的二维码传播违法信息',
        '如果是隐私链接自己保护好，不要随意分享'
      ],
      checkboxText: '已知晓',
      buttonText: '我已知晓 继续使用'
    },
    officialAccount: {
      name: 'JoJo茶酒志',
      desc: '茶酒文化 · 深度内容 · 每周更新',
      followTip: '长按识别二维码关注公众号'
    },
    qrcode: {
      defaultUrl: 'https://example.com/my-profile',
      defaultTopTitle: '扫一扫加入交流群',
      defaultBottomTitle: '获取独家干货资料',
      defaultSubtitle: '长按识别二维码，开启高效复盘',
      defaultForeground: '#1a1a2e',
      defaultBackground: '#ffffff',
      defaultStyle: 'rounded',
      defaultTemplate: 'cream'
    },
    qrStyles: [
      { id: 'classic', name: '经典方块' },
      { id: 'rounded', name: '圆润圆角点阵' },
      { id: 'artistic', name: '艺术点阵' }
    ],
    templates: [
      { id: 'cream', name: '✨ ins 奶油风', bg: 'linear-gradient(160deg, #faf6f0 0%, #f5ede2 50%, #efe5d6 100%)', accent: '#c26b5a', textColor: '#5c3d2e', cardBg: 'rgba(255,255,255,0.55)', borderColor: 'rgba(194,107,90,0.2)' },
      { id: 'minimal', name: '⚪ 极简风', bg: '#f7f7f8', accent: '#222222', textColor: '#1a1a1a', cardBg: '#ffffff', borderColor: '#e5e5e5' },
      { id: 'dark', name: '🌙 暗夜黑金', bg: 'linear-gradient(160deg, #0f0f1a 0%, #1a1a3e 50%, #2d1b4e 100%)', accent: '#f0c674', textColor: '#f0ece2', cardBg: 'rgba(255,255,255,0.06)', borderColor: 'rgba(240,198,116,0.3)' },
      { id: 'mint', name: '🌿 清新薄荷', bg: 'linear-gradient(160deg, #eafaf1 0%, #d4efdf 45%, #a9dfbf 100%)', accent: '#1e8449', textColor: '#145a32', cardBg: 'rgba(255,255,255,0.6)', borderColor: 'rgba(30,132,73,0.2)' },
      { id: 'lavender', name: '💜 梦幻紫', bg: 'linear-gradient(160deg, #f4ecf7 0%, #e8daef 45%, #d2b4de 100%)', accent: '#7d3c98', textColor: '#4a235a', cardBg: 'rgba(255,255,255,0.55)', borderColor: 'rgba(125,60,152,0.2)' },
      { id: 'ocean', name: '🌊 深海蓝', bg: 'linear-gradient(160deg, #e3f2fd 0%, #bbdefb 45%, #90caf9 100%)', accent: '#1565c0', textColor: '#0d47a1', cardBg: 'rgba(255,255,255,0.55)', borderColor: 'rgba(21,101,192,0.2)' }
    ],
    catPopup: {
      firstTriggerThreshold: 6,
      repeatInterval: 3,
      countdownSeconds: 5,
      content: '阅读广告是网站维持的根本，微信扫描下方二维码阅读并点击文末的广告支持我们吧！当然,你也可以选择残忍关掉弹窗继续免费使用。',
      buttonText: '已知晓，继续使用'
    }
  };

  /* ---------- 全局状态 ---------- */
  let config = DEFAULT_CONFIG;
  let logoImage = null;       // 用户上传的 Logo Image 对象
  let currentStyle = 'rounded';
  let currentTemplate = 'cream';
  let hasUserInteracted = false; // 用户是否主动修改过输入

  const STORAGE_KEY = 'qr_total_processed_count';

  /* ---------- DOM 引用 ---------- */
  const $ = (id) => document.getElementById(id);
  const dom = {};

  /* ---------- 工具函数 ---------- */
  function roundRect(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  // 判断是否为定位角（finder pattern）区域
  function isFinderArea(row, col, size) {
    return (row < 7 && col < 7) ||
           (row < 7 && col >= size - 7) ||
           (row >= size - 7 && col < 7);
  }

  function getCount() {
    return parseInt(localStorage.getItem(STORAGE_KEY) || '0', 10);
  }
  function setCount(n) {
    localStorage.setItem(STORAGE_KEY, String(n));
  }
  function incrementCount() {
    const n = getCount() + 1;
    setCount(n);
    return n;
  }

  function triggerDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  /* ---------- 二维码绘制核心 ---------- */
  function drawQRCode(canvas, text, fgColor, bgColor, style, logoImg, transparent) {
    const ctx = canvas.getContext('2d');
    const canvasSize = canvas.width;

    // 清空画布
    ctx.clearRect(0, 0, canvasSize, canvasSize);

    // 背景
    if (!transparent) {
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, canvasSize, canvasSize);
    }

    if (!text || !text.trim()) {
      // 空内容占位提示
      ctx.fillStyle = transparent ? 'rgba(0,0,0,0.3)' : '#9ca3af';
      ctx.font = '16px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('请输入二维码内容', canvasSize / 2, canvasSize / 2);
      return;
    }

    // 检查二维码库是否加载
    if (typeof QRCode === 'undefined' || !QRCode.create) {
      ctx.fillStyle = '#ef4444';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('二维码库未加载，请刷新页面', canvasSize / 2, canvasSize / 2);
      return;
    }

    // 生成二维码模块数据
    let qr;
    try {
      qr = QRCode.create(text, { errorCorrectionLevel: 'H' });
    } catch (e) {
      ctx.fillStyle = '#ef4444';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('内容过长，无法生成', canvasSize / 2, canvasSize / 2);
      return;
    }

    const modules = qr.modules;
    const size = modules.size;
    const data = modules.data;
    const padding = Math.round(canvasSize * 0.04);
    const moduleSize = (canvasSize - padding * 2) / size;

    ctx.fillStyle = fgColor;

    for (let row = 0; row < size; row++) {
      for (let col = 0; col < size; col++) {
        if (!data[row * size + col]) continue;
        const x = padding + col * moduleSize;
        const y = padding + row * moduleSize;

        if (style === 'classic') {
          ctx.fillRect(x, y, moduleSize, moduleSize);

        } else if (style === 'rounded') {
          // 圆润圆点
          const r = moduleSize * 0.48;
          ctx.beginPath();
          ctx.arc(x + moduleSize / 2, y + moduleSize / 2, r, 0, Math.PI * 2);
          ctx.fill();

        } else if (style === 'artistic') {
          // 艺术点阵：定位角保持标准方块，数据模块用圆角矩形
          if (isFinderArea(row, col, size)) {
            ctx.fillRect(x, y, moduleSize, moduleSize);
          } else {
            const r = moduleSize * 0.35;
            roundRect(ctx, x, y, moduleSize, moduleSize, r);
            ctx.fill();
          }
        }
      }
    }

    // 绘制中心 Logo
    if (logoImg && logoImg.complete && logoImg.naturalWidth > 0) {
      const logoSize = canvasSize * 0.22;
      const logoX = (canvasSize - logoSize) / 2;
      const logoY = (canvasSize - logoSize) / 2;
      const pad = logoSize * 0.12;

      // Logo 白色圆角底衬
      ctx.save();
      if (transparent) {
        ctx.fillStyle = '#ffffff';
      } else {
        ctx.fillStyle = bgColor;
      }
      roundRect(ctx, logoX - pad, logoY - pad, logoSize + pad * 2, logoSize + pad * 2, 10);
      ctx.fill();
      ctx.restore();

      // 绘制 Logo 图片（保持比例居中裁剪）
      ctx.save();
      roundRect(ctx, logoX, logoY, logoSize, logoSize, 6);
      ctx.clip();
      const imgRatio = logoImg.naturalWidth / logoImg.naturalHeight;
      let drawW, drawH, drawX, drawY;
      if (imgRatio > 1) {
        drawH = logoSize;
        drawW = logoSize * imgRatio;
        drawX = logoX - (drawW - logoSize) / 2;
        drawY = logoY;
      } else {
        drawW = logoSize;
        drawH = logoSize / imgRatio;
        drawX = logoX;
        drawY = logoY - (drawH - logoSize) / 2;
      }
      ctx.drawImage(logoImg, drawX, drawY, drawW, drawH);
      ctx.restore();
    }
  }

  /* ---------- 实时预览更新 ---------- */
  function updatePreview() {
    const text = dom.inputUrl.value.trim();
    const fg = dom.inputForeground.value;
    const bg = dom.inputBackground.value;

    // 更新文案预览
    dom.previewTopTitle.textContent = dom.inputTopTitle.value || ' ';
    dom.previewBottomTitle.textContent = dom.inputBottomTitle.value || ' ';
    dom.previewSubtitle.textContent = dom.inputSubtitle.value || ' ';

    // 绘制二维码
    drawQRCode(dom.qrCanvas, text, fg, bg, currentStyle, logoImage, false);

    // URL 提示
    if (!text) {
      dom.urlHint.textContent = '⚠ 内容为空，二维码暂未生成';
      dom.urlHint.style.color = '#ef4444';
    } else {
      dom.urlHint.textContent = '✓ 已实时生成二维码';
      dom.urlHint.style.color = '#10b981';
    }
  }

  /* ---------- 模板应用 ---------- */
  function applyTemplate(templateId) {
    const tmpl = config.templates.find(t => t.id === templateId) || config.templates[0];
    currentTemplate = tmpl.id;
    const card = dom.posterCard;
    card.style.setProperty('--poster-bg', tmpl.bg);
    card.style.setProperty('--poster-accent', tmpl.accent);
    card.style.setProperty('--poster-text', tmpl.textColor);
    card.style.setProperty('--poster-card-bg', tmpl.cardBg);
    card.style.setProperty('--poster-border', tmpl.borderColor);

    // 更新模板选项高亮
    document.querySelectorAll('.template-option').forEach(el => {
      el.classList.toggle('active', el.dataset.id === tmpl.id);
    });
  }

  /* ---------- 时间戳 ---------- */
  function updateTimestamp() {
    const now = new Date();
    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');
    const s = String(now.getSeconds()).padStart(2, '0');
    dom.posterTimestamp.textContent = `${h}:${m}:${s}`;
  }

  /* ---------- 渲染动态选项 ---------- */
  function renderStyleOptions() {
    dom.styleOptions.innerHTML = '';
    config.qrStyles.forEach(s => {
      const el = document.createElement('div');
      el.className = 'style-option' + (s.id === currentStyle ? ' active' : '');
      el.dataset.id = s.id;
      el.textContent = s.name;
      el.addEventListener('click', () => {
        markUserInteracted();
        currentStyle = s.id;
        document.querySelectorAll('.style-option').forEach(e => e.classList.remove('active'));
        el.classList.add('active');
        updatePreview();
      });
      dom.styleOptions.appendChild(el);
    });
  }

  function renderTemplateOptions() {
    dom.templateOptions.innerHTML = '';
    config.templates.forEach(t => {
      const el = document.createElement('div');
      el.className = 'template-option' + (t.id === currentTemplate ? ' active' : '');
      el.dataset.id = t.id;
      el.textContent = t.name;
      el.style.setProperty('--tmpl-bg', t.bg);
      el.addEventListener('click', () => {
        markUserInteracted();
        applyTemplate(t.id);
      });
      dom.templateOptions.appendChild(el);
    });
  }

  function renderNavTools() {
    dom.navTools.innerHTML = '';

    // 帮助按钮
    const helpCfg = config.help;
    if (helpCfg && helpCfg.name) {
      const helpBtn = document.createElement('button');
      helpBtn.className = 'nav-help-btn';
      helpBtn.textContent = helpCfg.name;
      helpBtn.addEventListener('click', showHelpModal);
      dom.navTools.appendChild(helpBtn);
    }

    // 更多工具链接
    const mt = config.moreTools;
    if (!mt || !mt.url) return;
    const link = document.createElement('a');
    link.className = 'nav-more-tools';
    link.href = mt.url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = mt.name || '更多工具';
    dom.navTools.appendChild(link);
  }

  /* ---------- 用户交互标记 ---------- */
  function markUserInteracted() {
    hasUserInteracted = true;
  }

  /* ---------- 下载：高清海报 ---------- */
  function downloadPoster() {
    if (typeof html2canvas === 'undefined') {
      alert('html2canvas 加载失败，请检查网络连接');
      return;
    }
    const btn = dom.btnDownloadPoster;
    const originalText = btn.textContent;
    btn.textContent = '⏳ 生成中...';
    btn.disabled = true;

    html2canvas(dom.posterCard, {
      scale: 3,
      useCORS: true,
      allowTaint: true,
      backgroundColor: null,
      logging: false
    }).then(canvas => {
      canvas.toBlob(blob => {
        if (blob) {
          const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
          triggerDownload(blob, `二维码海报_${ts}.png`);
          afterDownload();
        }
      }, 'image/png');
    }).catch(err => {
      console.error('海报生成失败:', err);
      alert('海报生成失败：' + err.message);
    }).finally(() => {
      btn.textContent = originalText;
      btn.disabled = false;
    });
  }

  /* ---------- 下载：纯二维码方图 ---------- */
  function downloadQRSquare(transparent) {
    const text = dom.inputUrl.value.trim();
    if (!text) {
      alert('请先输入二维码内容');
      return;
    }
    const size = 1200;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    drawQRCode(
      canvas,
      text,
      dom.inputForeground.value,
      dom.inputBackground.value,
      currentStyle,
      logoImage,
      transparent
    );
    canvas.toBlob(blob => {
      if (blob) {
        const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const suffix = transparent ? '_透明底' : '';
        triggerDownload(blob, `二维码${suffix}_${ts}.png`);
        afterDownload();
      }
    }, 'image/png');
  }

  /* ---------- 下载后统计 & 弹窗检测 ---------- */
  function afterDownload() {
    const count = incrementCount();
    checkCatPopup(count);
  }

  function checkCatPopup(count) {
    const cfg = config.catPopup;
    const threshold = cfg.firstTriggerThreshold;
    const interval = cfg.repeatInterval;
    // 首次超过阈值触发（count = threshold+1），之后每 interval 次触发
    const offset = count - threshold - 1;
    if (offset >= 0 && offset % interval === 0) {
      showCatPopup();
    }
  }

  /* ---------- 猫咪泪眼弹窗 ---------- */
  function showCatPopup() {
    const cfg = config.catPopup;
    dom.catModalText.textContent = cfg.content;
    dom.catModalBtn.disabled = true;
    let remaining = cfg.countdownSeconds;
    dom.catBtnText.textContent = `${cfg.buttonText} (${remaining}s)`;

    dom.catModal.classList.add('show');

    const timer = setInterval(() => {
      remaining--;
      if (remaining <= 0) {
        clearInterval(timer);
        dom.catModalBtn.disabled = false;
        dom.catBtnText.textContent = cfg.buttonText;
      } else {
        dom.catBtnText.textContent = `${cfg.buttonText} (${remaining}s)`;
      }
    }, 1000);
  }

  function hideCatPopup() {
    dom.catModal.classList.remove('show');
  }

  /* ---------- 声明弹窗（每次打开弹出） ---------- */
  function showDisclaimerModal() {
    const cfg = config.disclaimer;
    if (!cfg || !cfg.enabled) return;

    dom.disclaimerTitle.textContent = cfg.title || '声明';
    dom.disclaimerIntro.textContent = cfg.intro || '';
    dom.disclaimerCheckboxText.textContent = cfg.checkboxText || '已知晓';
    dom.disclaimerBtnText.textContent = cfg.buttonText || '我已知晓 继续使用';

    // 渲染规则列表
    dom.disclaimerRules.innerHTML = '';
    if (Array.isArray(cfg.rules)) {
      cfg.rules.forEach((rule, i) => {
        const li = document.createElement('li');
        li.textContent = `${i + 1}. ${rule}`;
        dom.disclaimerRules.appendChild(li);
      });
    }

    // 重置勾选状态和按钮
    dom.disclaimerCheckbox.checked = false;
    dom.disclaimerBtn.disabled = true;

    dom.disclaimerModal.classList.add('show');
  }

  function hideDisclaimerModal() {
    dom.disclaimerModal.classList.remove('show');
  }

  /* ---------- 帮助弹窗 ---------- */
  function showHelpModal() {
    const cfg = config.help;
    if (!cfg) return;
    dom.helpTitle.textContent = cfg.title || '使用帮助';
    // 支持 \n 换行
    dom.helpContent.innerHTML = (cfg.content || '').replace(/\n/g, '<br/>');
    dom.helpModal.classList.add('show');
  }

  function hideHelpModal() {
    dom.helpModal.classList.remove('show');
  }

  /* ---------- 关注弹窗（强硬弹窗） ---------- */
  function showFollowModal() {
    dom.followModal.classList.add('show');
  }
  function hideFollowModal() {
    dom.followModal.classList.remove('show');
  }

  /* ---------- Logo 上传处理 ---------- */
  function handleLogoUpload(file) {
    if (!file || !file.type.startsWith('image/')) {
      alert('请上传图片文件');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        logoImage = img;
        markUserInteracted();
        // 显示预览
        dom.logoPreview.innerHTML = `<img src="${e.target.result}" alt="logo" />`;
        dom.logoPreview.classList.add('show');
        dom.btnClearLogo.style.display = 'inline-block';
        updatePreview();
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  function clearLogo() {
    logoImage = null;
    dom.logoPreview.innerHTML = '';
    dom.logoPreview.classList.remove('show');
    dom.btnClearLogo.style.display = 'none';
    dom.inputLogo.value = '';
    updatePreview();
  }

  /* ---------- 初始化 ---------- */
  function initDomRefs() {
    const ids = [
      'navAvatar', 'navAvatarImg', 'navTitle', 'navSubtitle', 'navTools', 'btnFollow',
      'inputUrl', 'urlHint', 'inputTopTitle', 'inputBottomTitle', 'inputSubtitle',
      'inputForeground', 'foregroundHex', 'inputBackground', 'backgroundHex',
      'styleOptions', 'inputLogo', 'btnClearLogo', 'logoPreview',
      'templateOptions',
      'qrCanvas', 'posterCard', 'previewTopTitle', 'previewBottomTitle', 'previewSubtitle',
      'posterTimestamp',
      'btnDownloadQR', 'btnDownloadPoster',
      'qrDownloadOptions', 'transparentBg', 'btnConfirmQRDownload', 'btnCancelQRDownload',
      'followModal', 'followModalClose', 'followModalAvatar', 'followModalName', 'followModalDesc', 'followModalTip',
      'catModal', 'catModalText', 'catModalBtn', 'catBtnText',
      'disclaimerModal', 'disclaimerTitle', 'disclaimerIntro', 'disclaimerRules', 'disclaimerCheckbox', 'disclaimerCheckboxText', 'disclaimerBtn', 'disclaimerBtnText',
      'helpModal', 'helpModalClose', 'helpTitle', 'helpContent'
    ];
    ids.forEach(id => { dom[id] = $(id); });
  }

  function applyConfig() {
    // 站点信息
    dom.navTitle.textContent = config.site.title;
    dom.navSubtitle.textContent = config.site.subtitle;
    document.title = config.site.title + ' · ' + config.site.subtitle;

    // 头像（仅导航栏和关注弹窗使用）
    dom.navAvatarImg.src = config.avatar;
    dom.followModalAvatar.src = config.avatar;

    // 公众号信息（仅关注弹窗使用）
    dom.followModalName.textContent = config.officialAccount.name;
    dom.followModalDesc.textContent = config.officialAccount.desc;
    dom.followModalTip.textContent = config.officialAccount.followTip;

    // 二维码默认值
    const q = config.qrcode;
    dom.inputUrl.value = q.defaultUrl;
    dom.inputTopTitle.value = q.defaultTopTitle;
    dom.inputBottomTitle.value = q.defaultBottomTitle;
    dom.inputSubtitle.value = q.defaultSubtitle;
    dom.inputForeground.value = q.defaultForeground;
    dom.inputBackground.value = q.defaultBackground;
    dom.foregroundHex.textContent = q.defaultForeground;
    dom.backgroundHex.textContent = q.defaultBackground;
    currentStyle = q.defaultStyle;
    currentTemplate = q.defaultTemplate;
  }

  function bindEvents() {
    // 表单实时更新
    const updateFields = ['inputUrl', 'inputTopTitle', 'inputBottomTitle', 'inputSubtitle'];
    updateFields.forEach(id => {
      dom[id].addEventListener('input', () => {
        markUserInteracted();
        updatePreview();
      });
    });

    // 颜色选择
    dom.inputForeground.addEventListener('input', () => {
      markUserInteracted();
      dom.foregroundHex.textContent = dom.inputForeground.value;
      updatePreview();
    });
    dom.inputBackground.addEventListener('input', () => {
      markUserInteracted();
      dom.backgroundHex.textContent = dom.inputBackground.value;
      updatePreview();
    });

    // Logo 上传
    dom.inputLogo.addEventListener('change', (e) => {
      if (e.target.files[0]) handleLogoUpload(e.target.files[0]);
    });
    dom.btnClearLogo.addEventListener('click', clearLogo);

    // 下载海报
    dom.btnDownloadPoster.addEventListener('click', downloadPoster);

    // 下载二维码方图（弹出选项）
    dom.btnDownloadQR.addEventListener('click', () => {
      dom.qrDownloadOptions.style.display = 'flex';
    });
    dom.btnCancelQRDownload.addEventListener('click', () => {
      dom.qrDownloadOptions.style.display = 'none';
    });
    dom.btnConfirmQRDownload.addEventListener('click', () => {
      const transparent = dom.transparentBg.checked;
      dom.qrDownloadOptions.style.display = 'none';
      downloadQRSquare(transparent);
    });

    // 关注弹窗：点击头像或关注按钮弹出
    dom.navAvatar.addEventListener('click', showFollowModal);
    dom.btnFollow.addEventListener('click', showFollowModal);
    // 只能点右上角 × 关闭
    dom.followModalClose.addEventListener('click', hideFollowModal);
    // 遮罩层点击无效（不绑定关闭事件）

    // 猫咪弹窗：只能点 button 关闭
    dom.catModalBtn.addEventListener('click', hideCatPopup);

    // 声明弹窗：勾选后按钮才可点击
    dom.disclaimerCheckbox.addEventListener('change', () => {
      dom.disclaimerBtn.disabled = !dom.disclaimerCheckbox.checked;
    });
    dom.disclaimerBtn.addEventListener('click', hideDisclaimerModal);

    // 帮助弹窗：点 × 或遮罩层关闭
    dom.helpModalClose.addEventListener('click', hideHelpModal);
    dom.helpModal.addEventListener('click', (e) => {
      if (e.target === dom.helpModal) hideHelpModal();
    });
  }

  async function loadConfig() {
    try {
      const res = await fetch('config.json', { cache: 'no-store' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      // 深度合并，确保字段完整
      config = Object.assign({}, DEFAULT_CONFIG, data);
      config.site = Object.assign({}, DEFAULT_CONFIG.site, data.site || {});
      config.officialAccount = Object.assign({}, DEFAULT_CONFIG.officialAccount, data.officialAccount || {});
      config.qrcode = Object.assign({}, DEFAULT_CONFIG.qrcode, data.qrcode || {});
      config.catPopup = Object.assign({}, DEFAULT_CONFIG.catPopup, data.catPopup || {});
      config.help = Object.assign({}, DEFAULT_CONFIG.help, data.help || {});
      config.disclaimer = Object.assign({}, DEFAULT_CONFIG.disclaimer, data.disclaimer || {});
      // disclaimer.rules 需要单独处理（数组不能用 Object.assign 合并）
      if (data.disclaimer && Array.isArray(data.disclaimer.rules)) {
        config.disclaimer.rules = data.disclaimer.rules;
      }
      if (!config.moreTools || typeof config.moreTools !== 'object') config.moreTools = DEFAULT_CONFIG.moreTools;
      if (!Array.isArray(config.qrStyles) || config.qrStyles.length === 0) config.qrStyles = DEFAULT_CONFIG.qrStyles;
      if (!Array.isArray(config.templates) || config.templates.length === 0) config.templates = DEFAULT_CONFIG.templates;
      console.log('[config] 已加载 config.json');
    } catch (e) {
      console.warn('[config] config.json 加载失败，使用内置默认配置:', e.message);
      config = DEFAULT_CONFIG;
    }
  }

  async function init() {
    // 库加载检查
    if (typeof QRCode === 'undefined') {
      console.error('[错误] qrcode.min.js 未加载，请检查 lib/qrcode.min.js 是否存在');
      alert('错误：二维码库未加载！请确认 lib/qrcode.min.js 文件存在。');
      return;
    }
    if (typeof html2canvas === 'undefined') {
      console.warn('[警告] html2canvas 未加载，海报下载功能将不可用');
    } else {
      console.log('[init] 依赖库加载成功');
    }

    initDomRefs();
    await loadConfig();
    applyConfig();
    renderNavTools();
    renderStyleOptions();
    renderTemplateOptions();
    applyTemplate(currentTemplate);
    bindEvents();
    updatePreview();
    updateTimestamp();
    setInterval(updateTimestamp, 1000);

    console.log(`[统计] 累计下载数: ${getCount()}`);

    // 每次打开站点弹出声明
    showDisclaimerModal();
  }

  // 启动
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

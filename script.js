/**
 * Jakarta Language - Main Application Script
 * Handles navigation, playground, syntax highlighting, and documentation
 */

(function() {
  'use strict';

  // ============================================================
  // EXAMPLES
  // ============================================================

  const EXAMPLES = {
    hello: `// Hello World di Jakarta
tulis("Halo, Dunia! 🇮🇩");
tulis("Selamat datang di bahasa Jakarta!");`,

    variables: `// Variabel dan Tipe Data
biar nama = "Jakarta";
biar versi = 1.0;
biar pi = 3.14159;
biar aktif = benar;
konstan BAHASA = "Jakarta";

tulis("Nama: " + nama);
tulis("Versi: " + keString(versi));
tulis("PI: " + keString(pi));
tulis("Aktif: " + keString(aktif));
tulis("Bahasa: " + BAHASA);

// Tipe data
tulis(jenis(42));
tulis(jenis("teks"));
tulis(jenis(benar));
tulis(jenis(kosong));`,

    functions: `// Fungsi
fungsi tambah(a, b) {
    kembali a + b;
}

fungsi faktorial(n) {
    jika (n <= 1) {
        kembali 1;
    }
    kembali n * faktorial(n - 1);
}

fungsi salam(nama, waktu) {
    jika (waktu == "pagi") {
        kembali "Selamat pagi, " + nama + "!";
    } lainjika (waktu == "siang") {
        kembali "Selamat siang, " + nama + "!";
    } lain {
        kembali "Halo, " + nama + "!";
    }
}

tulis("3 + 5 = " + keString(tambah(3, 5)));
tulis("5! = " + keString(faktorial(5)));
tulis(salam("Jakarta", "pagi"));
tulis(salam("Dunia", "malam"));`,

    loops: `// Perulangan

// Selama (while)
biar i = 1;
selama (i <= 5) {
    tulis("Iterasi ke-" + keString(i));
    i += 1;
}

tulis("---");

// Untuk-Dalam (for-in)
untuk (x dalam [10, 20, 30, 40, 50]) {
    tulis("Nilai: " + keString(x));
}

tulis("---");

// Rentang
untuk (i dalam rentang(1, 6)) {
    tulis("Angka: " + keString(i));
}`,

    arrays: `// Daftar (Array)
biar buah = ["Mangga", "Durian", "Rambutan", "Salak"];

tulis("Buah: " + gabung(buah, ", "));
tulis("Jumlah: " + keString(panjang(buah)));

// Tambah elemen
buah = buah + ["Jambu"];
tulis("Setelah tambah: " + gabung(buah, ", "));

// Akses elemen
tulis("Pertama: " + buah[0]);
tulis("Terakhir: " + buah[panjang(buah) - 1]);

// Urutkan
biar angka = [5, 3, 8, 1, 9, 2];
tulis("Asli: " + gabung(angka, ", "));
tulis("Urut: " + gabung(urut(angka), ", "));
tulis("Balik: " + gabung(balik(angka), ", "));

// Rentang
biar r = rentang(1, 10, 2);
tulis("Rentang(1,10,2): " + gabung(r, ", "));`,

    advanced: `// Fitur Lanjutan

// Ternary operator
biar umur = 20;
biar status = umur >= 17 ? "dewasa" : "anak";
tulis("Status: " + status);

// Range operator
biar deret = 1..5;
tulis("Deret: " + gabung(deret, ", "));

// Power operator
tulis("2^10 = " + keString(2 ** 10));

// Template literal
biar kota = "Jakarta";
tulis(\`Selamat datang di \${kota}!\`);

// String operations
biar teks1 = "Halo Jakarta";
tulis("Besar: " + besar(teks1));
tulis("Kecil: " + kecil(teks1));
tulis("Ganti: " + ganti(teks1, "Jakarta", "Dunia"));
tulis("Belah: " + gabung(belah(teks1, " "), "-"));

// Math built-ins
tulis("PI = " + keString(PI));
tulis("Akar 144 = " + keString(akar(144)));
tulis("Abs(-42) = " + keString(abs(-42)));
tulis("Bulat(3.7) = " + keString(bulat(3.7)));
tulis("Lantai(3.7) = " + keString(lantai(3.7)));
tulis("Atap(3.2) = " + keString(atap(3.2)));

// Nested functions
fungsi buat_pengganda(faktor) {
    fungsi pengganda(x) {
        kembali x * faktor;
    }
    kembali pengganda;
}

biar kali3 = buat_pengganda(3);
tulis("5 x 3 = " + keString(kali3(5)));

// Object
biar orang = {nama: "Budi", umur: 25, kota: "Jakarta"};
tulis("Nama: " + orang.nama);
tulis("Umur: " + keString(orang.umur));`
  };

  // ============================================================
  // SYNTAX HIGHLIGHTER
  // ============================================================

  const KEYWORDS_SET = new Set([
    'cetak', 'tulis', 'var', 'biar', 'konstan', 'fungsi', 'kembali',
    'jika', 'lain', 'lainjika', 'selama', 'untuk', 'dalam',
    'benar', 'salah', 'kosong', 'tidakdef', 'dan', 'atau', 'bukan',
    'putus', 'luar', 'lanjut', 'jenis'
  ]);

  const BUILTINS_SET = new Set([
    'panjang', 'tipe', 'angka', 'teks', 'urut', 'balik', 'rentang',
    'bulat', 'lantai', 'atap', 'akar', 'abs', 'besar', 'kecil',
    'gabung', 'belah', 'ganti', 'dorong', 'keluar', 'sisip', 'hapus',
    'filter', 'peta', 'temukan', 'setiap', 'beberapa', 'kurangi',
    'keString', 'keTeks', 'keAngka', 'keBilangan', 'bulatkan',
    'kuadrat', 'pangkat', 'acak', 'acakBilangan', 'maks', 'min',
    'potong', 'PI', 'E'
  ]);

  function escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function highlightCode(code) {
    let result = '';
    let i = 0;
    const len = code.length;

    while (i < len) {
      // Comments
      if (code[i] === '/' && code[i + 1] === '/') {
        let end = code.indexOf('\n', i);
        if (end === -1) end = len;
        result += `<span class="syn-comment">${escapeHtml(code.slice(i, end))}</span>`;
        i = end;
        continue;
      }
      if (code[i] === '/' && code[i + 1] === '*') {
        let end = code.indexOf('*/', i + 2);
        if (end === -1) end = len; else end += 2;
        result += `<span class="syn-comment">${escapeHtml(code.slice(i, end))}</span>`;
        i = end;
        continue;
      }

      // Strings
      if (code[i] === '"' || code[i] === "'") {
        const quote = code[i];
        let j = i + 1;
        while (j < len && code[j] !== quote) {
          if (code[j] === '\\') j++;
          j++;
        }
        j++; // include closing quote
        result += `<span class="syn-string">${escapeHtml(code.slice(i, j))}</span>`;
        i = j;
        continue;
      }

      // Template literals
      if (code[i] === '`') {
        let j = i + 1;
        let templateContent = '`';
        while (j < len && code[j] !== '`') {
          if (code[j] === '\\') {
            templateContent += escapeHtml(code.slice(j, j + 2));
            j += 2;
            continue;
          }
          if (code[j] === '$' && code[j + 1] === '{') {
            templateContent += '<span class="syn-punctuation">${</span>';
            j += 2;
            let depth = 1;
            let exprContent = '';
            while (j < len && depth > 0) {
              if (code[j] === '{') depth++;
              if (code[j] === '}') { depth--; if (depth === 0) break; }
              exprContent += code[j];
              j++;
            }
            // Highlight the expression inside
            templateContent += highlightCode(exprContent);
            if (j < len) {
              templateContent += '<span class="syn-punctuation">}</span>';
              j++;
            }
            continue;
          }
          templateContent += escapeHtml(code[j]);
          j++;
        }
        if (j < len) { templateContent += '`'; j++; }
        result += `<span class="syn-string">${templateContent}</span>`;
        i = j;
        continue;
      }

      // Numbers
      if (/\d/.test(code[i]) && (i === 0 || !/[\w]/.test(code[i - 1]))) {
        let j = i;
        while (j < len && /[\d.]/.test(code[j])) j++;
        result += `<span class="syn-number">${escapeHtml(code.slice(i, j))}</span>`;
        i = j;
        continue;
      }

      // Identifiers & keywords
      if (/[a-zA-Z_]/.test(code[i]) || code.charCodeAt(i) > 127) {
        let j = i;
        while (j < len && /[\w]/.test(code[j])) j++;
        const word = code.slice(i, j);
        if (KEYWORDS_SET.has(word)) {
          result += `<span class="syn-keyword">${escapeHtml(word)}</span>`;
        } else if (BUILTINS_SET.has(word)) {
          result += `<span class="syn-builtin">${escapeHtml(word)}</span>`;
        } else if (word === 'benar' || word === 'salah') {
          result += `<span class="syn-boolean">${escapeHtml(word)}</span>`;
        } else {
          // Check if it's followed by ( — function call
          let k = j;
          while (k < len && code[k] === ' ') k++;
          if (code[k] === '(') {
            result += `<span class="syn-function">${escapeHtml(word)}</span>`;
          } else {
            result += escapeHtml(word);
          }
        }
        i = j;
        continue;
      }

      // Operators
      if ('+-*/%=<>!&|^?:'.includes(code[i])) {
        result += `<span class="syn-operator">${escapeHtml(code[i])}</span>`;
        i++;
        continue;
      }

      // Punctuation
      if ('(){}[],;.'.includes(code[i])) {
        result += `<span class="syn-punctuation">${escapeHtml(code[i])}</span>`;
        i++;
        continue;
      }

      // Everything else
      result += escapeHtml(code[i]);
      i++;
    }

    return result;
  }

  // ============================================================
  // PLAYGROUND CONTROLLER
  // ============================================================

  const codeEditor = document.getElementById('codeEditor');
  const syntaxHighlight = document.getElementById('syntaxHighlight');
  const lineNumbers = document.getElementById('lineNumbers');
  const outputBody = document.getElementById('outputBody');
  const outputStatus = document.getElementById('outputStatus');
  const runBtn = document.getElementById('runBtn');
  const clearBtn = document.getElementById('clearBtn');
  const exampleSelect = document.getElementById('exampleSelect');

  function updateLineNumbers() {
    const lines = codeEditor.value.split('\n').length;
    const nums = [];
    for (let i = 1; i <= lines; i++) nums.push(i);
    lineNumbers.textContent = nums.join('\n');
  }

  function updateSyntaxHighlight() {
    const code = codeEditor.value;
    syntaxHighlight.innerHTML = highlightCode(code) + '\n'; // Extra newline for scrolling
  }

  function syncScroll() {
    syntaxHighlight.scrollTop = codeEditor.scrollTop;
    syntaxHighlight.scrollLeft = codeEditor.scrollLeft;
    lineNumbers.scrollTop = codeEditor.scrollTop;
  }

  function appendOutput(text, className = '') {
    const line = document.createElement('div');
    line.className = 'output-line' + (className ? ' ' + className : '');
    line.textContent = text;
    outputBody.appendChild(line);
    outputBody.scrollTop = outputBody.scrollHeight;
  }

  function clearOutput() {
    outputBody.innerHTML = '';
    outputStatus.textContent = '';
    outputStatus.className = 'output-status';
  }

  function runCode() {
    clearOutput();
    outputStatus.textContent = 'Running...';
    outputStatus.className = 'output-status';

    const source = codeEditor.value;
    if (!source.trim()) {
      appendOutput('Tidak ada kode untuk dijalankan.', '');
      outputStatus.textContent = 'Ready';
      return;
    }

    const startTime = performance.now();
    let hasError = false;

    try {
      const interp = new JakartaInterpreter.Interpreter((text) => {
        appendOutput(text);
      });

      // Set execution timeout
      const timeoutMs = 5000;
      const timeoutId = setTimeout(() => {
        throw new Error('Execution timed out');
      }, timeoutMs);

      interp.run(source);
      clearTimeout(timeoutId);

      const elapsed = (performance.now() - startTime).toFixed(1);
      outputStatus.textContent = `✓ ${elapsed}ms`;
      outputStatus.className = 'output-status success';

      // Check if no output
      if (outputBody.children.length === 0) {
        appendOutput('(Tidak ada output)', '');
      }
    } catch (e) {
      hasError = true;
      let errorMsg = '';
      if (e.name === 'LexerError') {
        errorMsg = `❌ Kesalahan Leksikal: ${e.message}`;
      } else if (e.name === 'ParseError') {
        errorMsg = `❌ Kesalahan Sintaks: ${e.message}`;
      } else if (e.name === 'RuntimeError') {
        errorMsg = `❌ Kesalahan Runtime: ${e.message}`;
      } else {
        errorMsg = `❌ Kesalahan: ${e.message}`;
      }
      appendOutput(errorMsg, 'error-line');
      outputStatus.textContent = 'Error';
      outputStatus.className = 'output-status error';
    }
  }

  // Editor events
  codeEditor.addEventListener('input', () => {
    updateLineNumbers();
    updateSyntaxHighlight();
  });

  codeEditor.addEventListener('scroll', syncScroll);

  codeEditor.addEventListener('keydown', (e) => {
    // Tab support
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = codeEditor.selectionStart;
      const end = codeEditor.selectionEnd;
      const value = codeEditor.value;
      if (e.shiftKey) {
        // Unindent
        const lineStart = value.lastIndexOf('\n', start - 1) + 1;
        if (value.slice(lineStart, lineStart + 4) === '    ') {
          codeEditor.value = value.slice(0, lineStart) + value.slice(lineStart + 4);
          codeEditor.selectionStart = codeEditor.selectionEnd = start - 4;
        }
      } else {
        codeEditor.value = value.substring(0, start) + '    ' + value.substring(end);
        codeEditor.selectionStart = codeEditor.selectionEnd = start + 4;
      }
      updateLineNumbers();
      updateSyntaxHighlight();
    }

    // Ctrl+Enter to run
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      runCode();
    }

    // Auto-close brackets
    const pairs = { '(': ')', '[': ']', '{': '}', '"': '"', "'": "'" , '`': '`' };
    if (pairs[e.key]) {
      const start = codeEditor.selectionStart;
      const end = codeEditor.selectionEnd;
      if (start !== end) {
        // Wrap selection
        e.preventDefault();
        const selected = codeEditor.value.substring(start, end);
        codeEditor.value = codeEditor.value.substring(0, start) + e.key + selected + pairs[e.key] + codeEditor.value.substring(end);
        codeEditor.selectionStart = start + 1;
        codeEditor.selectionEnd = end + 1;
        updateLineNumbers();
        updateSyntaxHighlight();
      }
    }

    // Auto-indent on Enter
    if (e.key === 'Enter') {
      const start = codeEditor.selectionStart;
      const value = codeEditor.value;
      const lineStart = value.lastIndexOf('\n', start - 1) + 1;
      const currentLine = value.slice(lineStart, start);
      const indent = currentLine.match(/^\s*/)[0];
      const lastChar = value[start - 1];
      const nextChar = value[start];

      if (lastChar === '{' && nextChar === '}') {
        e.preventDefault();
        const newIndent = indent + '    ';
        codeEditor.value = value.slice(0, start) + '\n' + newIndent + '\n' + indent + value.slice(start);
        codeEditor.selectionStart = codeEditor.selectionEnd = start + 1 + newIndent.length;
      } else if (lastChar === '{' || lastChar === ':') {
        e.preventDefault();
        const newIndent = indent + '    ';
        codeEditor.value = value.slice(0, start) + '\n' + newIndent + value.slice(start);
        codeEditor.selectionStart = codeEditor.selectionEnd = start + 1 + newIndent.length;
      } else {
        e.preventDefault();
        codeEditor.value = value.slice(0, start) + '\n' + indent + value.slice(start);
        codeEditor.selectionStart = codeEditor.selectionEnd = start + 1 + indent.length;
      }
      updateLineNumbers();
      updateSyntaxHighlight();
    }
  });

  // Run & Clear buttons
  runBtn.addEventListener('click', runCode);
  clearBtn.addEventListener('click', () => {
    clearOutput();
  });

  // Example selector
  exampleSelect.addEventListener('change', (e) => {
    const key = e.target.value;
    if (EXAMPLES[key]) {
      codeEditor.value = EXAMPLES[key];
      updateLineNumbers();
      updateSyntaxHighlight();
      clearOutput();
    }
    e.target.value = '';
  });

  // ============================================================
  // RESIZER
  // ============================================================

  const resizer = document.getElementById('resizer');
  const editorPanel = document.getElementById('editorPanel');
  const outputPanel = document.getElementById('outputPanel');
  const playgroundMain = document.querySelector('.playground-main');

  let isResizing = false;

  resizer.addEventListener('mousedown', (e) => {
    isResizing = true;
    resizer.classList.add('active');
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    e.preventDefault();
  });

  document.addEventListener('mousemove', (e) => {
    if (!isResizing) return;
    const rect = playgroundMain.getBoundingClientRect();
    const offset = e.clientX - rect.left;
    const totalWidth = rect.width;
    const minSize = 200;
    const editorWidth = Math.max(minSize, Math.min(totalWidth - minSize, offset));
    const outputWidth = totalWidth - editorWidth - 6; // 6px for resizer

    editorPanel.style.flex = 'none';
    editorPanel.style.width = editorWidth + 'px';
    outputPanel.style.flex = 'none';
    outputPanel.style.width = outputWidth + 'px';
  });

  document.addEventListener('mouseup', () => {
    if (isResizing) {
      isResizing = false;
      resizer.classList.remove('active');
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }
  });

  // ============================================================
  // NAVIGATION
  // ============================================================

  const navbar = document.getElementById('navbar');
  const navLinks = document.getElementById('navLinks');
  const navToggle = document.getElementById('navToggle');
  const allNavLinks = document.querySelectorAll('.nav-link');

  // Mobile menu toggle
  navToggle.addEventListener('click', () => {
    navLinks.classList.toggle('open');
  });

  // Close mobile menu on link click
  allNavLinks.forEach(link => {
    link.addEventListener('click', () => {
      navLinks.classList.remove('open');
    });
  });

  // Active section tracking
  const sections = document.querySelectorAll('section[id]');

  function updateActiveNav() {
    const scrollPos = window.scrollY + 100;

    sections.forEach(section => {
      const top = section.offsetTop;
      const height = section.offsetHeight;
      const id = section.getAttribute('id');

      if (scrollPos >= top && scrollPos < top + height) {
        allNavLinks.forEach(link => {
          link.classList.remove('active');
          if (link.getAttribute('data-section') === id) {
            link.classList.add('active');
          }
        });
      }
    });
  }

  // Navbar scroll effect
  function updateNavbar() {
    if (window.scrollY > 50) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
  }

  window.addEventListener('scroll', () => {
    updateActiveNav();
    updateNavbar();
  });

  // ============================================================
  // SCROLL ANIMATIONS
  // ============================================================

  const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
      }
    });
  }, observerOptions);

  // Observe elements
  document.querySelectorAll('.section-title, .section-subtitle, .feature-card, .doc-card').forEach(el => {
    observer.observe(el);
  });

  // ============================================================
  // HERO PARTICLES
  // ============================================================

  function createParticles() {
    const container = document.getElementById('heroParticles');
    if (!container) return;

    for (let i = 0; i < 20; i++) {
      const particle = document.createElement('div');
      particle.className = 'hero-particle';
      particle.style.left = Math.random() * 100 + '%';
      particle.style.top = (60 + Math.random() * 40) + '%';
      particle.style.animationDelay = Math.random() * 8 + 's';
      particle.style.animationDuration = (6 + Math.random() * 6) + 's';
      particle.style.width = (2 + Math.random() * 4) + 'px';
      particle.style.height = particle.style.width;
      container.appendChild(particle);
    }
  }

  // ============================================================
  // DOCUMENTATION SIDEBAR
  // ============================================================

  const docsNavLinks = document.querySelectorAll('.docs-nav-link');

  function updateDocsNav() {
    const scrollPos = window.scrollY + 120;

    docsNavLinks.forEach(link => {
      const href = link.getAttribute('href');
      const section = document.querySelector(href);
      if (section) {
        const top = section.offsetTop;
        const height = section.offsetHeight;
        if (scrollPos >= top && scrollPos < top + height) {
          docsNavLinks.forEach(l => l.classList.remove('active'));
          link.classList.add('active');
        }
      }
    });
  }

  window.addEventListener('scroll', updateDocsNav);

  // ============================================================
  // EXAMPLE TOGGLE
  // ============================================================

  window.toggleExample = function(header) {
    const item = header.parentElement;
    item.classList.toggle('open');
  };

  // ============================================================
  // INITIALIZATION
  // ============================================================

  function init() {
    createParticles();
    updateLineNumbers();
    updateSyntaxHighlight();

    // Load default example
    codeEditor.value = EXAMPLES.hello;
    updateLineNumbers();
    updateSyntaxHighlight();

    // Initial nav state
    updateNavbar();
    updateActiveNav();
  }

  // Wait for DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
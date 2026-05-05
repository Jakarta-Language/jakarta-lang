/**
 * Jakarta Language Playground - App Controller
 */

(function() {
  const codeEditor = document.getElementById('codeEditor');
  const output = document.getElementById('output');
  const runBtn = document.getElementById('runBtn');
  const clearBtn = document.getElementById('clearBtn');
  const examples = document.getElementById('examples');
  const lineInfo = document.getElementById('lineInfo');
  const execTime = document.getElementById('execTime');
  const lineNumbers = document.getElementById('lineNumbers');
  const statusIndicator = document.getElementById('statusIndicator');

  const EXAMPLES = {
    hello: `// Hello World di Jakarta
cetak("Halo, Dunia! 🇮🇩")
cetak("Selamat datang di bahasa Jakarta!")`,

    variables: `// Variabel dan Tipe Data
var nama = "Jakarta"
var versi = 1
var pi = 3.14159
var aktif = benar

cetak("Nama: " + nama)
cetak("Versi: " + teks(versi))
cetak("PI: " + teks(pi))
cetak("Aktif: " + teks(aktif))

// Konstan
konstan BAHASA = "Jakarta"
cetak("Bahasa: " + BAHASA)

// Tipe data
cetak(tipe(42))
cetak(tipe("teks"))
cetak(tipe(benar))
cetak(tipe(kosong))`,

    loops: `// Perulangan

// Selama (while)
var i = 1
selama (i <= 5) {
  cetak("Iterasi ke-" + teks(i))
  i += 1
}

cetak("---")

// Untuk-Dalam (for-in)
untuk (x dalam [10, 20, 30, 40, 50]) {
  cetak("Nilai: " + teks(x))
}

cetak("---")

// Rentang
untuk (i dalam rentang(1, 6)) {
  cetak("Angka: " + teks(i))
}`,

    functions: `// Fungsi

fungsi tambah(a, b) {
  kembali a + b
}

fungsi faktorial(n) {
  jika (n <= 1) {
    kembali 1
  }
  kembali n * faktorial(n - 1)
}

fungsi salam(nama, waktu) {
  jika (waktu == "pagi") {
    kembali "Selamat pagi, " + nama + "!"
  } lain jika (waktu == "siang") {
    kembali "Selamat siang, " + nama + "!"
  } lain {
    kembali "Halo, " + nama + "!"
  }
}

cetak("3 + 5 = " + teks(tambah(3, 5)))
cetak("5! = " + teks(faktorial(5)))
cetak(salam("Jakarta", "pagi"))
cetak(salam("Dunia", "malam"))`,

    arrays: `// Daftar (Array)

var buah = ["Mangga", "Durian", "Rambutan", "Salak"]
cetak("Buah: " + gabung(buah, ", "))
cetak("Jumlah: " + teks(panjang(buah)))

// Tambah elemen
buah = buah + ["Jambu"]
cetak("Setelah tambah: " + gabung(buah, ", "))

// Akses elemen
cetak("Pertama: " + buah[0])
cetak("Terakhir: " + buah[panjang(buah) - 1])

// Urutkan
var angka = [5, 3, 8, 1, 9, 2]
cetak("Asli: " + gabung(angka, ", "))
cetak("Urut: " + gabung(urut(angka), ", "))
cetak("Balik: " + gabung(balik(angka), ", "))

// Rentang
var r = rentang(1, 10, 2)
cetak("Rentang(1,10,2): " + gabung(r, ", "))`,

    advanced: `// Fitur Lanjutan

// Ternary operator
var umur = 20
var status = umur >= 17 ? "dewasa" : "anak"
cetak("Status: " + status)

// Range operator
var deret = 1..5
cetak("Deret: " + gabung(deret, ", "))

// Power operator
cetak("2^10 = " + teks(2 ** 10))

// String operations
var teks1 = "Halo Jakarta"
cetak("Besar: " + besar(teks1))
cetak("Kecil: " + kecil(teks1))
cetak("Ganti: " + ganti(teks1, "Jakarta", "Dunia"))
cetak("Belah: " + gabung(belah(teks1, " "), "-"))

// Math built-ins
cetak("PI = " + teks(PI))
cetak("E = " + teks(E))
cetak("Akar 144 = " + teks(akar(144)))
cetak("Abs(-42) = " + teks(abs(-42)))
cetak("Bulat(3.7) = " + teks(bulat(3.7)))
cetak("Lantai(3.7) = " + teks(lantai(3.7)))
cetak("Atap(3.2) = " + teks(atap(3.2)))

// Nested functions
fungsi buat_pengganda(faktor) {
  fungsi pengganda(x) {
    kembali x * faktor
  }
  kembali pengganda
}

var kali3 = buat_pengganda(3)
cetak("5 x 3 = " + teks(kali3(5)))`,
  };

  function updateLineNumbers() {
    const lines = codeEditor.value.split('\n').length;
    const nums = [];
    for (let i = 1; i <= lines; i++) nums.push(i);
    lineNumbers.textContent = nums.join('\n');
    lineInfo.textContent = `Baris: ${lines}`;
  }

  function appendOutput(text, className = '') {
    const line = document.createElement('div');
    line.className = 'output-line' + (className ? ' ' + className : '');
    line.textContent = text;
    output.appendChild(line);
  }

  function clearOutput() {
    output.innerHTML = '';
    execTime.textContent = '';
  }

  function setStatus(status, text) {
    statusIndicator.className = 'status status-' + status;
    statusIndicator.textContent = text;
  }

  function runCode() {
    clearOutput();
    setStatus('running', 'Menjalankan...');

    const source = codeEditor.value;
    if (!source.trim()) {
      appendOutput('Tidak ada kode untuk dijalankan.', 'output-info');
      setStatus('ready', 'Siap');
      return;
    }

    const startTime = performance.now();
    let outputLines = [];

    try {
      const interp = new JakartaInterpreter.Interpreter((text) => {
        outputLines.push(text);
      });
      interp.run(source);

      for (const line of outputLines) {
        appendOutput(line);
      }

      const elapsed = (performance.now() - startTime).toFixed(1);
      execTime.textContent = `${elapsed}ms`;

      if (outputLines.length === 0) {
        appendOutput('(Tidak ada output)', 'output-info');
      }
      setStatus('ready', 'Siap');
    } catch (e) {
      if (e.name === 'LexerError') {
        appendOutput(`❌ Kesalahan Leksikal: ${e.message}`, 'output-error');
      } else if (e.name === 'ParseError') {
        appendOutput(`❌ Kesalahan Sintaks: ${e.message}`, 'output-error');
      } else if (e.name === 'RuntimeError') {
        appendOutput(`❌ Kesalahan Runtime: ${e.message}`, 'output-error');
      } else {
        appendOutput(`❌ Kesalahan: ${e.message}`, 'output-error');
      }
      setStatus('error', 'Error');
    }
  }

  // Event listeners
  runBtn.addEventListener('click', runCode);

  clearBtn.addEventListener('click', () => {
    codeEditor.value = '';
    clearOutput();
    updateLineNumbers();
    setStatus('ready', 'Siap');
  });

  examples.addEventListener('change', (e) => {
    const key = e.target.value;
    if (EXAMPLES[key]) {
      codeEditor.value = EXAMPLES[key];
      updateLineNumbers();
      clearOutput();
    }
    e.target.value = '';
  });

  codeEditor.addEventListener('input', updateLineNumbers);
  codeEditor.addEventListener('scroll', () => {
    lineNumbers.scrollTop = codeEditor.scrollTop;
  });

  codeEditor.addEventListener('keydown', (e) => {
    // Tab support
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = codeEditor.selectionStart;
      const end = codeEditor.selectionEnd;
      codeEditor.value = codeEditor.value.substring(0, start) + '  ' + codeEditor.value.substring(end);
      codeEditor.selectionStart = codeEditor.selectionEnd = start + 2;
      updateLineNumbers();
    }
    // Ctrl+Enter to run
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      runCode();
    }
  });

  // Initialize
  updateLineNumbers();
  setStatus('ready', 'Siap');
})();
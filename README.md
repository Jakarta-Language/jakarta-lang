# 🇮🇩 Jakarta Language (.jkt)

Bahasa pemrograman berbasis Bahasa Indonesia dengan sintaks yang mudah dipahami.

A programming language based on Indonesian with intuitive, easy-to-understand syntax.

---

## 📦 Struktur Proyek / Project Structure

```
jakarta-lang/
├── package.json                    # VS Code extension manifest
├── language-configuration.json     # Language config (brackets, comments)
├── syntaxes/
│   └── jakarta.tmLanguage.json     # Syntax highlighting (TextMate grammar)
├── snippets/
│   └── jakarta.json                # Code snippets
├── images/
│   └── jakarta-icon.svg            # File icon for .jkt
├── src/
│   ├── interpreter.py              # Python interpreter (reference)
│   ├── go/
│   │   └── main.go                 # Go interpreter
│   ├── ruby/
│   │   └── interpreter.rb          # Ruby interpreter
│   ├── rust/
│   │   ├── Cargo.toml              # Rust project manifest
│   │   └── src/main.rs             # Rust interpreter
│   ├── c/
│   │   └── jakarta.c               # C interpreter
│   ├── java/
│   │   └── JakartaInterpreter.java # Java interpreter
│   ├── node/
│   │   ├── package.json            # Node.js project manifest
│   │   ├── tsconfig.json           # TypeScript config
│   │   └── src/
│   │       ├── interpreter.ts      # TypeScript interpreter
│   │       └── cli.ts              # CLI entry point
│   └── shell/
│       └── jakarta.sh              # Shell interpreter (basic)
├── web/
│   ├── index.html                  # Web playground UI
│   ├── style.css                   # Playground styles
│   ├── interpreter.js              # Browser interpreter
│   └── app.js                      # Playground controller
├── example/
│   ├── main.jkt                    # Basic example
│   └── advanced.jkt                # Advanced example
└── README.md
```

---

## 🚀 VS Code Extension

### Install via VSIX (Recommended)

```bash
npm install -g @vscode/vsce
cd jakarta-lang
vsce package
code --install-extension jakarta-lang-0.1.0.vsix
```

### Manual Install

1. Copy the `jakarta-lang` folder to `~/.vscode/extensions/` (or `%USERPROFILE%\.vscode\extensions\` on Windows)
2. Restart VS Code

### Extension Features

- ✅ Syntax highlighting for `.jkt` files
- ✅ Code snippets for all keywords and constructs
- ✅ Bracket matching and auto-closing
- ✅ Comment toggling (`//` and `/* */`)
- ✅ Custom file icon

---

## 🖥️ Interpreter Versions

### Python (Reference Implementation)

```bash
python src/interpreter.py example/main.jkt
python src/interpreter.py              # REPL mode
```

### Go

```bash
cd src/go
go run main.go ../../example/main.jkt
go build -o jakarta main.go
./jakarta file.jkt
```

### Ruby

```bash
ruby src/ruby/interpreter.rb example/main.jkt
ruby src/ruby/interpreter.rb              # REPL mode
```

### Rust

```bash
cd src/rust
cargo run -- ../../example/main.jkt
cargo build --release
./target/release/jakarta file.jkt
```

### C

```bash
gcc -o jakarta src/c/jakarta.c -lm
./jakarta example/main.jkt
```

### Java

```bash
javac src/java/JakartaInterpreter.java
java -cp src/java JakartaInterpreter example/main.jkt
```

### Node.js / TypeScript

```bash
cd src/node
npm install
npx ts-node src/cli.ts ../../example/main.jkt
npm run build
node dist/cli.js file.jkt
```

### Shell (Basic)

```bash
bash src/shell/jakarta.sh example/main.jkt
```

### Web Playground

Open `web/index.html` in any modern browser. Features:
- Code editor with line numbers
- Example programs dropdown
- Real-time execution with error reporting
- Execution time display
- Keyboard shortcuts: `Ctrl+Enter` to run, `Tab` for indentation

---

## 📖 Sintaks Bahasa Jakarta / Language Syntax

### Kata Kunci / Keywords

| Jakarta | English | Fungsi / Purpose |
|---------|---------|------------------|
| `cetak` | print | Print to screen |
| `var` | var | Variable declaration |
| `konstan` | const | Constant declaration |
| `fungsi` | function | Function definition |
| `kembali` | return | Return value |
| `jika` | if | Conditional |
| `lain` | else | Else branch |
| `selama` | while | While loop |
| `untuk` | for | For loop |
| `dalam` | in | Iteration |
| `benar` | true | Boolean true |
| `salah` | false | Boolean false |
| `kosong` | null | Null value |
| `dan` | and | Logical AND |
| `atau` | or | Logical OR |
| `bukan` | not | Logical NOT |
| `putus` | break | Break loop |
| `lanjut` | continue | Continue loop |

### Operator

| Kategori | Operator |
|----------|----------|
| Aritmatika | `+`, `-`, `*`, `/`, `%`, `**` |
| Perbandingan | `==`, `!=`, `<`, `>`, `<=`, `>=` |
| Logika | `dan`/`&&`, `atau`/\|\|`, `bukan`/`!` |
| Assignment | `=`, `+=`, `-=`, `*=`, `/=` |
| Increment | `++`, `--` |
| Range | `..` |
| Ternary | `? :` |

### Tipe Data / Data Types

| Jakarta | English | Contoh / Example |
|---------|---------|------------------|
| `angka` | number | `42`, `3.14` |
| `teks` | string | `"Halo"`, `'Jakarta'` |
| `boolean` | boolean | `benar`, `salah` |
| `daftar` | list | `[1, 2, 3]` |
| `kosong` | null | `kosong` |

### Fungsi Bawaan / Built-in Functions

| Fungsi | English | Contoh / Example |
|--------|---------|------------------|
| `panjang(x)` | length | `panjang("Halo")` → 4 |
| `tipe(x)` | type | `tipe(42)` → "angka" |
| `angka(x)` | number | `angka("42")` → 42 |
| `teks(x)` | string | `teks(42)` → "42" |
| `rentang(a,b)` | range | `rentang(1,5)` → [1,2,3,4] |
| `urut(x)` | sort | `urut([3,1,2])` → [1,2,3] |
| `balik(x)` | reverse | `balik("abc")` → "cba" |
| `akar(x)` | sqrt | `akar(9)` → 3.0 |
| `abs(x)` | abs | `abs(-5)` → 5 |
| `bulat(x)` | round | `bulat(3.7)` → 4 |
| `lantai(x)` | floor | `lantai(3.7)` → 3 |
| `atap(x)` | ceil | `atap(3.2)` → 4 |
| `besar(x)` | upper | `besar("abc")` → "ABC" |
| `kecil(x)` | lower | `kecil("ABC")` → "abc" |
| `gabung(x,s)` | join | `gabung([1,2], "-")` → "1-2" |
| `belah(x,s)` | split | `belah("a-b", "-")` → ["a","b"] |
| `ganti(x,a,b)` | replace | `ganti("halo", "h", "H")` → "Halo" |

### Konstanta / Constants

| Nama | Nilai |
|------|-------|
| `PI` | 3.141592653589793 |
| `E` | 2.718281828459045 |

---

## 💡 Contoh Kode / Code Examples

### Hello World

```jakarta
cetak("Halo, Jakarta! 🇮🇩")
```

### Variabel & Tipe Data

```jakarta
var nama = "Budi"
var umur = 25
var pi = 3.14159
var aktif = benar

konstan BAHASA = "Jakarta"
cetak("Nama: " + nama)
cetak("Tipe: " + tipe(umur))
```

### Fungsi & Rekursi

```jakarta
fungsi faktorial(n) {
    jika (n <= 1) {
        kembali 1
    }
    kembali n * faktorial(n - 1)
}

cetak("5! = " + teks(faktorial(5)))
```

### Perulangan / Loops

```jakarta
// Selama (while)
var i = 1
selama (i <= 5) {
    cetak(teks(i))
    i += 1
}

// Untuk-Dalam (for-in)
untuk (x dalam rentang(1, 6)) {
    cetak("Angka: " + teks(x))
}
```

### Daftar / Arrays

```jakarta
var buah = ["Mangga", "Durian", "Rambutan"]
cetak("Jumlah: " + teks(panjang(buah)))
cetak("Urut: " + gabung(urut([3,1,2]), ", "))
```

### Closures

```jakarta
fungsi buat_pengganda(faktor) {
    fungsi pengganda(x) {
        kembali x * faktor
    }
    kembali pengganda
}

var kali3 = buat_pengganda(3)
cetak("5 x 3 = " + teks(kali3(5)))
```

### Ternary & Range

```jakarta
var umur = 20
var status = umur >= 17 ? "dewasa" : "anak"
cetak("Status: " + status)

var deret = 1..5
cetak("Deret: " + gabung(deret, ", "))
```

---

## 🏗️ Interpreter Feature Matrix

| Feature | Python | Go | Ruby | Rust | C | Java | Node.js | Shell | Web |
|---------|--------|----|------|------|---|------|---------|-------|-----|
| Lexer | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Parser | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ⬜ | ✅ |
| Variables | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Constants | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ⬜ | ✅ |
| Functions | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Recursion | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ⬜ | ✅ |
| Closures | ✅ | ✅ | ✅ | ✅ | ⬜ | ✅ | ✅ | ⬜ | ✅ |
| If/Else | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| While Loop | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| For-In Loop | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ⬜ | ✅ |
| Arrays | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ⬜ | ✅ |
| String Ops | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ⬜ | ✅ |
| Built-ins | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ⬜ | ✅ |
| Ternary | ✅ | ✅ | ✅ | ✅ | ⬜ | ✅ | ✅ | ⬜ | ✅ |
| Range | ✅ | ✅ | ✅ | ✅ | ⬜ | ✅ | ✅ | ⬜ | ✅ |
| Break/Continue | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ⬜ | ✅ |
| REPL | ✅ | ⬜ | ✅ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |

✅ = Full support | ⬜ = Not implemented

---

## 📝 License

MIT License - Bebas digunakan dan dimodifikasi!
#!/usr/bin/env node
/**
 * Jakarta Language CLI - Node.js Entry Point
 */

import * as fs from 'fs';
import * as path from 'path';
import { Interpreter } from './interpreter';

function main(): void {
  if (process.argv.length < 3) {
    console.log('🇮🇩 Jakarta Language Interpreter (Node.js) v0.1.0');
    console.log('Cara pakai: jakarta <file.jkt>');
    console.log('');
    console.log('Mode REPL (ketik "keluar" untuk keluar):');
    const readline = require('readline');
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const interp = new Interpreter();
    const prompt = () => rl.question('jkt> ', (line: string) => {
      if (['keluar', 'exit', 'quit'].includes(line.trim())) { rl.close(); return; }
      if (line.trim()) {
        try {
          const result = interp.run(line);
        } catch (e: any) {
          console.log(`Error: ${e.message}`);
        }
      }
      prompt();
    });
    prompt();
    return;
  }

  const filePath = process.argv[2];
  if (!filePath.endsWith('.jkt')) {
    console.error('❌ File harus berekstensi .jkt');
    process.exit(1);
  }

  if (!fs.existsSync(filePath)) {
    console.error(`❌ File "${filePath}" tidak ditemukan`);
    process.exit(1);
  }

  const source = fs.readFileSync(filePath, 'utf-8');
  const interp = new Interpreter();

  try {
    interp.run(source);
  } catch (e: any) {
    console.error(`❌ Kesalahan: ${e.message}`);
    process.exit(1);
  }
}

main();
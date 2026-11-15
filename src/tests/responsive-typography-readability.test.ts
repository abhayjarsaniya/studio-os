import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { TYPOGRAPHY } from '../utils/theme';

describe('Studio OS - Responsive Typography & Font Readability System', () => {
  it('should define centralized TYPOGRAPHY design tokens for all core roles', () => {
    expect(TYPOGRAPHY).toBeDefined();
    expect(TYPOGRAPHY.pageTitle).toBeDefined();
    expect(TYPOGRAPHY.sectionTitle).toBeDefined();
    expect(TYPOGRAPHY.cardTitle).toBeDefined();
    expect(TYPOGRAPHY.body).toBeDefined();
    expect(TYPOGRAPHY.secondary).toBeDefined();
    expect(TYPOGRAPHY.caption).toBeDefined();
    expect(TYPOGRAPHY.label).toBeDefined();
    expect(TYPOGRAPHY.button).toBeDefined();
    expect(TYPOGRAPHY.nav).toBeDefined();
    expect(TYPOGRAPHY.tableCell).toBeDefined();
    expect(TYPOGRAPHY.tableHeader).toBeDefined();
    expect(TYPOGRAPHY.calendarDate).toBeDefined();
    expect(TYPOGRAPHY.calendarEvent).toBeDefined();
    expect(TYPOGRAPHY.badge).toBeDefined();
  });

  it('should have fluid clamp typography tokens and mobile/desktop input rules in index.css', () => {
    const cssPath = path.resolve(__dirname, '../index.css');
    const cssContent = fs.readFileSync(cssPath, 'utf8');

    // Check clamp definitions
    expect(cssContent).toContain('--text-page-title: clamp(');
    expect(cssContent).toContain('--text-section-title: clamp(');
    expect(cssContent).toContain('--text-card-title: clamp(');
    expect(cssContent).toContain('--text-body: clamp(');
    expect(cssContent).toContain('--text-secondary: clamp(');
    expect(cssContent).toContain('--text-caption: clamp(');

    // Check iOS auto-zoom prevention: mobile 16px, desktop 15px (0.9375rem)
    expect(cssContent).toContain('font-size: 16px;');
    expect(cssContent).toContain('font-size: 0.9375rem;');

    // Check utility classes
    expect(cssContent).toContain('.text-page-title');
    expect(cssContent).toContain('.text-section-title');
    expect(cssContent).toContain('.text-card-title');
    expect(cssContent).toContain('.text-caption-readable');
    expect(cssContent).toContain('.text-form-label');
    expect(cssContent).toContain('.text-btn-label');
    expect(cssContent).toContain('.text-nav-label');
    expect(cssContent).toContain('.text-table-cell');
    expect(cssContent).toContain('.text-table-heading');
  });

  it('strictly contains ZERO occurrences of sub-12px font utility classes (8px, 9px, 10px, 11px) across src', () => {
    function walk(dir: string): string[] {
      let results: string[] = [];
      const list = fs.readdirSync(dir);
      list.forEach(file => {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat && stat.isDirectory()) {
          results = results.concat(walk(fullPath));
        } else if (/\.(tsx|ts|css)$/.test(file)) {
          results.push(fullPath);
        }
      });
      return results;
    }

    const srcDir = path.resolve(__dirname, '../');
    const files = walk(srcDir);
    const sub12pxRegex = /(?:sm:|md:|lg:|hover:|focus:)?text-\[(?:8|9|10|11)px\]/g;
    const violations: { file: string; line: number; text: string }[] = [];

    files.forEach(f => {
      // Don't test this test file itself
      if (f.includes('responsive-typography-readability.test.ts')) return;

      const lines = fs.readFileSync(f, 'utf8').split('\n');
      lines.forEach((line, index) => {
        if (sub12pxRegex.test(line)) {
          violations.push({
            file: path.relative(srcDir, f),
            line: index + 1,
            text: line.trim()
          });
        }
      });
    });

    expect(violations).toEqual([]);
  });
});

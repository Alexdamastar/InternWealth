'use client';

// A tiny, dependency-free Markdown renderer. The LLM's chat replies, working
// plan, and explanations come back as Markdown; rendering it as React elements
// (never dangerouslySetInnerHTML) means bold/italic/lists/headings/links/emoji
// display properly instead of showing raw "**stars**" and ":tada:" shortcodes.
// Deliberately small: it covers the constructs an LLM actually emits in prose,
// and keeps InternWealth's "runs locally, minimal deps" story intact.
import React from 'react';

// A handful of common emoji shortcodes an LLM tends to use in friendly copy.
const EMOJI: Record<string, string> = {
  tada: '🎉',
  rocket: '🚀',
  money_with_wings: '💸',
  moneybag: '💰',
  chart_with_upwards_trend: '📈',
  bank: '🏦',
  bulb: '💡',
  warning: '⚠️',
  white_check_mark: '✅',
  heavy_check_mark: '✔️',
  '+1': '👍',
  thumbsup: '👍',
  sparkles: '✨',
  star: '⭐',
  star2: '🌟',
  fire: '🔥',
  wave: '👋',
  pray: '🙏',
  muscle: '💪',
  clap: '👏',
  point_right: '👉',
  smile: '😄',
  tada2: '🎊',
  chart: '📊',
  lock: '🔒',
};

function replaceEmoji(text: string): string {
  return text.replace(/:([a-z0-9_+-]+):/gi, (m, name) => EMOJI[name.toLowerCase()] ?? m);
}

// Matches (in order) bold, inline code, links, then italic (* or _).
const INLINE_RE =
  /(\*\*([^*]+)\*\*)|(`([^`]+)`)|(\[([^\]]+)\]\(([^)]+)\))|(\*([^*]+)\*)|(_([^_]+)_)/;

// Turn a run of inline text into React nodes, honoring emphasis/code/links/emoji.
function parseInline(text: string, keyPrefix: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  let rest = text;
  let i = 0;
  while (rest.length) {
    const m = rest.match(INLINE_RE);
    if (!m || m.index === undefined) {
      nodes.push(replaceEmoji(rest));
      break;
    }
    if (m.index > 0) nodes.push(replaceEmoji(rest.slice(0, m.index)));
    const key = `${keyPrefix}-${i++}`;
    if (m[1]) {
      nodes.push(<strong key={key}>{parseInline(m[2], key)}</strong>);
    } else if (m[3]) {
      nodes.push(
        <code key={key} className="bg-line/50 px-1 py-0.5 text-[0.85em] font-mono">
          {m[4]}
        </code>,
      );
    } else if (m[5]) {
      nodes.push(
        <a
          key={key}
          href={m[7]}
          target="_blank"
          rel="noreferrer noopener"
          className="text-moss underline hover:text-moss-deep"
        >
          {parseInline(m[6], key)}
        </a>,
      );
    } else if (m[8]) {
      nodes.push(<em key={key}>{parseInline(m[9], key)}</em>);
    } else if (m[10]) {
      nodes.push(<em key={key}>{parseInline(m[11], key)}</em>);
    }
    rest = rest.slice(m.index + m[0].length);
  }
  return nodes;
}

function renderBlock(block: string, key: string): React.ReactNode {
  const lines = block.split('\n').filter((l) => l.trim() !== '');
  if (lines.length === 0) return null;

  // Heading (#, ##, ###, ####) — a single line.
  const heading = lines.length === 1 ? lines[0].match(/^(#{1,4})\s+(.*)$/) : null;
  if (heading) {
    const level = heading[1].length;
    const size = ['text-base', 'text-sm', 'text-sm', 'text-sm'][level - 1];
    return (
      <p key={key} className={`font-semibold ${size} mt-1`}>
        {parseInline(heading[2], key)}
      </p>
    );
  }

  // Unordered list — every line is a bullet.
  if (lines.every((l) => /^\s*[-*]\s+/.test(l))) {
    return (
      <ul key={key} className="list-disc pl-5 space-y-1">
        {lines.map((l, i) => (
          <li key={i}>{parseInline(l.replace(/^\s*[-*]\s+/, ''), `${key}-${i}`)}</li>
        ))}
      </ul>
    );
  }

  // Ordered list — every line is "1." style.
  if (lines.every((l) => /^\s*\d+\.\s+/.test(l))) {
    return (
      <ol key={key} className="list-decimal pl-5 space-y-1">
        {lines.map((l, i) => (
          <li key={i}>{parseInline(l.replace(/^\s*\d+\.\s+/, ''), `${key}-${i}`)}</li>
        ))}
      </ol>
    );
  }

  // Paragraph — join wrapped lines, preserving single newlines as soft breaks.
  return (
    <p key={key} className="leading-relaxed">
      {lines.map((l, i) => (
        <React.Fragment key={i}>
          {i > 0 && <br />}
          {parseInline(l, `${key}-${i}`)}
        </React.Fragment>
      ))}
    </p>
  );
}

export default function Markdown({
  content,
  className,
}: {
  content: string;
  className?: string;
}) {
  const blocks = content.replace(/\r\n/g, '\n').trim().split(/\n{2,}/);
  return (
    <div className={className ?? 'space-y-2'}>
      {blocks.map((block, bi) => renderBlock(block, `b${bi}`)).filter(Boolean)}
    </div>
  );
}

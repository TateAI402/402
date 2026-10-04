// The brand mark: the supplied TATE lettering (glow and grain kept, black made transparent) with 402 set beside it.
export function WordmarkSvg({ className = '' }) {
  return <span className={'brandmark ' + className}><img src="/brand/tate-mark-alpha.png" alt="" width="190" height="87" /><sup>402</sup></span>;
}
export default WordmarkSvg;

const WASH = "/nazarov-bg-wash.webp?v=dmed4";
const MARK = "/nazarov-mark.webp?v=dmed4";

export function PageBackdrop() {
  return (
    <div aria-hidden className="page-backdrop">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={WASH}
        alt=""
        decoding="async"
        fetchPriority="high"
        draggable={false}
        className="page-backdrop-wash"
      />
      <div className="page-backdrop-glow" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={MARK}
        alt=""
        width={620}
        height={620}
        decoding="async"
        loading="lazy"
        fetchPriority="low"
        draggable={false}
        className="page-backdrop-mark"
      />
    </div>
  );
}

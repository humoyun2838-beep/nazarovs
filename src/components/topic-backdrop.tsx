export function TopicBackdrop({
  wash,
  mark,
}: {
  wash: string;
  mark?: string;
}) {
  return (
    <>
      <div aria-hidden className="topic-scene">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={wash}
          src={wash}
          alt=""
          decoding="async"
          fetchPriority="high"
          draggable={false}
          className="topic-scene-silk"
        />
        {mark ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={mark}
            src={mark}
            alt=""
            decoding="async"
            draggable={false}
            className="topic-scene-mark"
          />
        ) : null}
      </div>
    </>
  );
}


import { UiText } from "@/components/ui-locale";
export function VisitMap({
  embed,
  href,
  label,
  coords,
}: {
  embed: string;
  href: string;
  label: string;
  coords?: string;
}) {
  if (!embed && !href && !label && !coords) {
    return (
      <p className="text-xs text-[#7a7166]"><UiText>{" Joylashuv topilmadi (ichki tarmoq yoki IP yashirin). "}</UiText></p>
    );
  }
  return (
    <div className="space-y-2">
      {label ? (
        <p className="text-sm text-[#12315f]">
          <span className="font-medium"><UiText>{"Lokatsiya:"}</UiText></span> <UiText>{label}</UiText>
        </p>
      ) : null}
      {coords ? (
        <p className="font-mono text-sm text-[#0b4fa8]">
          <span className="font-sans font-medium text-[#12315f]"><UiText>{"Google koordinata: "}</UiText></span>
          <UiText>{coords}</UiText>
        </p>
      ) : null}
      {embed ? (
        <div className="overflow-hidden rounded-2xl ring-1 ring-[#d7e4fb]">
          <iframe
            title="Google Maps"
            src={embed}
            className="h-44 w-full border-0"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            allowFullScreen
          />
        </div>
      ) : null}
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          className="inline-flex text-xs font-semibold text-[#0b4fa8] underline underline-offset-2"
        ><UiText>{" Google Maps’da ochish "}</UiText></a>
      ) : null}
    </div>
  );
}

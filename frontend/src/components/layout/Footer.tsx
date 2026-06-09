import { MapPin, Phone, Mail, Clock } from 'lucide-react';

import { cn } from '@/lib/utils';

const SocialIcon = ({ d }: { d: string }) => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
  >
    <path d={d} />
  </svg>
);

const FACEBOOK_PATH =
  'M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95c5.05-.5 9-4.76 9-9.95z';
const INSTAGRAM_PATH =
  'M7 2C4.24 2 2 4.24 2 7v10c0 2.76 2.24 5 5 5h10c2.76 0 5-2.24 5-5V7c0-2.76-2.24-5-5-5H7zm10 2c1.66 0 3 1.34 3 3v10c0 1.66-1.34 3-3 3H7c-1.66 0-3-1.34-3-3V7c0-1.66 1.34-3 3-3h10zm1.5 1.5a1 1 0 100 2 1 1 0 000-2zM12 7a5 5 0 100 10 5 5 0 000-10zm0 2a3 3 0 110 6 3 3 0 010-6z';
const YOUTUBE_PATH =
  'M21.6 7.2a2.5 2.5 0 00-1.76-1.77C18.27 5 12 5 12 5s-6.27 0-7.84.43A2.5 2.5 0 002.4 7.2C2 8.78 2 12 2 12s0 3.22.4 4.8a2.5 2.5 0 001.76 1.77C5.73 19 12 19 12 19s6.27 0 7.84-.43a2.5 2.5 0 001.76-1.77C22 15.22 22 12 22 12s0-3.22-.4-4.8zM10 15V9l5 3-5 3z';
const TIKTOK_PATH =
  'M19.6 6.32a5.6 5.6 0 01-3.36-1.12 5.6 5.5 0 01-2.24-3.2H10.4v13.12a2.56 2.56 0 11-2.56-2.56c.28 0 .55.05.8.13V9.36a6 6 0 00-.8-.06 5.92 5.92 0 105.92 5.92V9.6a8 8 0 005.84 2.24V8.4a5.4 5.4 0 01-1.6-.16 5.6 5.6 0 01-1.4-.92z';

type FooterProps = { className?: string };

export default function Footer({ className }: FooterProps) {
  return (
    <footer
      data-testid="footer"
      className={cn(
        'border-border bg-background border-t px-8 pt-[60px]',
        className,
      )}
      id="contact"
    >
      <div className="border-border mx-auto grid max-w-[1200px] grid-cols-1 gap-10 border-b pb-12 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_1.5fr]">
        <div className="flex flex-col gap-3">
          <h4 className="text-xs-plus tracking-px text-foreground mb-1 font-bold uppercase">
            Address
          </h4>
          <div className="text-foreground/65 flex items-start gap-2 text-[12px] leading-[1.6]">
            <MapPin size={15} className="text-primary mt-0.5 shrink-0" />
            <span>
              Fitness Centrum XY
              <br />
              Údolí 221, 602 00 Brno-střed
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <h4 className="text-xs-plus tracking-px text-foreground mb-1 font-bold uppercase">
            Contact
          </h4>
          <div className="text-foreground/65 flex items-start gap-2 text-[12px] leading-[1.6]">
            <Phone size={15} className="text-primary mt-0.5 shrink-0" />
            <span>+420 000 111 222</span>
          </div>
          <div className="text-foreground/65 flex items-start gap-2 text-[12px] leading-[1.6]">
            <Mail size={15} className="text-primary mt-0.5 shrink-0" />
            <span>info@fitnessxy.cz</span>
          </div>
          <div className="text-foreground/65 flex items-start gap-2 text-[12px] leading-[1.6]">
            <span className="text-foreground/65 text-[12px]">
              Manager: Janko Mrkvička
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <h4 className="text-xs-plus tracking-px text-foreground mb-1 font-bold uppercase">
            Opening Hours
          </h4>
          <div className="text-foreground/65 flex items-start gap-2 text-[12px] leading-[1.6]">
            <Clock size={15} className="text-primary mt-0.5 shrink-0" />
            <span>
              Mon – Fri: 6:00 – 22:00
              <br />
              Sat – Sun: 8:00 – 20:00
            </span>
          </div>
          <div className="mt-4 flex gap-3.5">
            <a
              href="#"
              aria-label="Facebook"
              className="text-foreground/70 hover:text-primary inline-flex items-center justify-center transition-colors"
            >
              <SocialIcon d={FACEBOOK_PATH} />
            </a>
            <a
              href="#"
              aria-label="Instagram"
              className="text-foreground/70 hover:text-primary inline-flex items-center justify-center transition-colors"
            >
              <SocialIcon d={INSTAGRAM_PATH} />
            </a>
            <a
              href="#"
              aria-label="TikTok"
              className="text-foreground/70 hover:text-primary inline-flex items-center justify-center transition-colors"
            >
              <SocialIcon d={TIKTOK_PATH} />
            </a>
            <a
              href="#"
              aria-label="YouTube"
              className="text-foreground/70 hover:text-primary inline-flex items-center justify-center transition-colors"
            >
              <SocialIcon d={YOUTUBE_PATH} />
            </a>
          </div>
        </div>

        <div className="order-first col-span-full min-h-[240px] w-full overflow-hidden rounded-[var(--radius)] lg:order-none lg:col-auto lg:min-h-[200px]">
          <iframe
            title="Fitness Centrum XY location"
            src="https://www.google.com/maps?q=Údolní+221%2F3%2C+602+00+Brno&output=embed"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            className="block h-full min-h-[200px] w-full border-0"
          />
        </div>
      </div>
      <div className="text-foreground/65 mx-auto max-w-[1200px] py-5 text-[12px]">
        <p>© 2026 Fitness XY. All rights reserved.</p>
      </div>
    </footer>
  );
}

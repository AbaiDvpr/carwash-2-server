"use client";

import { useState } from "react";
import ServiceFillProgress from "@/features/map/charging/ServiceFillProgress";
import { PRELOADER_SVG_SRC } from "@/features/profile/components/preloaderVariants";

/**
 * Статические кейсы экранов мойки для /dashboard.
 * Стили только в ./dashboard-wash-cases.css — глобальные wash CSS не трогаем.
 */

const LOGO_MASK = {
  WebkitMaskImage: `url(${PRELOADER_SVG_SRC})`,
  maskImage: `url(${PRELOADER_SVG_SRC})`,
  WebkitMaskRepeat: "no-repeat",
  maskRepeat: "no-repeat",
  WebkitMaskPosition: "center",
  maskPosition: "center",
  WebkitMaskSize: "119.07% 509.45%",
  maskSize: "119.07% 509.45%",
} as const;

function WashIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 2.2C12 2.2 5.5 9.4 5.5 13.5a6.5 6.5 0 0 0 13 0C18.5 9.4 12 2.2 12 2.2Z" />
    </svg>
  );
}

function OkIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
      <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ShellHead({ plate }: { plate?: string }) {
  return (
    <div className="dw-shell__head">
      <span className="dw-badge" aria-hidden>
        <WashIcon />
        <span>Мойка</span>
      </span>
      {plate ? <p className="dw-plate">{plate}</p> : null}
    </div>
  );
}

/** 1. Очередь / ожидание — варианты через табы */
const WAITING_VARIANTS = [
  { id: "spinner", label: "Спиннер" },
  { id: "place", label: "Место" },
  { id: "eta", label: "Время" },
  { id: "lane", label: "Очередь" },
  { id: "logo", label: "Лого" },
  { id: "signal", label: "Сигнал" },
  { id: "mist", label: "Туман" },
  { id: "wave", label: "Волна" },
] as const;

type WaitingVariantId = (typeof WAITING_VARIANTS)[number]["id"];

function WaitingCopy({
  title,
  hint,
}: {
  title: string;
  hint: string;
}) {
  return (
    <div className="dw-prep__copy">
      <p className="dw-prep__title">{title}</p>
      <p className="dw-prep__hint">{hint}</p>
    </div>
  );
}

function WaitLaneCar({ you }: { you?: boolean }) {
  return (
    <span className={you ? "dw-wait__car is-you" : "dw-wait__car"} aria-hidden>
      <span className="dw-wait__car-roof" />
      <span className="dw-wait__car-body" />
      <span className="dw-wait__car-wheel dw-wait__car-wheel--l" />
      <span className="dw-wait__car-wheel dw-wait__car-wheel--r" />
      {you ? <span className="dw-wait__lane-you">вы</span> : null}
    </span>
  );
}

export function WashCaseWaiting() {
  const [variant, setVariant] = useState<WaitingVariantId>("spinner");

  return (
    <div className="dw-case dw-case--waiting">
      <div className="dw-variant-switch" role="tablist" aria-label="Вариант экрана ожидания">
        {WAITING_VARIANTS.map((item) => {
          const on = variant === item.id;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={on}
              className={on ? "dw-variant-switch__btn is-on" : "dw-variant-switch__btn"}
              onClick={() => setVariant(item.id)}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      <section className="dw-card dw-shell">
        <ShellHead plate="123 ABC 01" />

        {variant === "spinner" ? (
          <div className="dw-prep__stage">
            <WaitingCopy
              title="Вы в очереди"
              hint="Как освободится место — мы вас пригласим."
            />
            <div className="dw-prep__preloader" aria-hidden>
              <span className="dw-spinner" />
            </div>
          </div>
        ) : null}

        {variant === "place" ? (
          <div className="dw-prep__stage">
            <WaitingCopy
              title="Вы третий"
              hint="Перед вами две машины. Пригласим, как освободится бокс."
            />
            <div className="dw-wait__place" aria-hidden>
              <p className="dw-wait__place-num">3</p>
              <p className="dw-wait__place-label">место</p>
            </div>
            <div className="dw-wait__chips">
              <span>2 впереди</span>
              <span>бокс #3 занят</span>
            </div>
          </div>
        ) : null}

        {variant === "eta" ? (
          <div className="dw-prep__stage">
            <WaitingCopy
              title="Ожидание ~7 мин"
              hint="Очередь двигается. Мы напишем, когда можно заезжать."
            />
            <div className="dw-wait__eta" aria-hidden>
              <span className="dw-wait__ring" />
              <span className="dw-wait__eta-value">7</span>
              <span className="dw-wait__eta-unit">мин</span>
            </div>
          </div>
        ) : null}

        {variant === "lane" ? (
          <div className="dw-prep__stage">
            <WaitingCopy
              title="Вы в очереди"
              hint="Три машины перед вами. Ваша — последняя."
            />
            <div className="dw-wait__lane" aria-hidden>
              <span className="dw-wait__lane-gate">бокс</span>
              <div className="dw-wait__lane-track">
                <WaitLaneCar />
                <WaitLaneCar />
                <WaitLaneCar />
                <WaitLaneCar you />
              </div>
            </div>
          </div>
        ) : null}

        {variant === "logo" ? (
          <div className="dw-prep__stage">
            <WaitingCopy
              title="Вы в очереди"
              hint="Как освободится место — мы вас пригласим."
            />
            <div className="dw-wait__logo" aria-hidden>
              <span className="dw-wait__logo-base" style={LOGO_MASK} />
              <span className="dw-wait__logo-pulse" style={LOGO_MASK} />
            </div>
          </div>
        ) : null}

        {variant === "signal" ? (
          <div className="dw-prep__stage">
            <WaitingCopy
              title="Ждём свободный бокс"
              hint="Следим за мойкой. Как освободится — загорится ваш сигнал."
            />
            <div className="dw-wait__signal" aria-hidden>
              <span className="dw-wait__signal-ring dw-wait__signal-ring--1" />
              <span className="dw-wait__signal-ring dw-wait__signal-ring--2" />
              <span className="dw-wait__signal-ring dw-wait__signal-ring--3" />
              <span className="dw-wait__signal-core">
                <span className="dw-wait__signal-dot" />
              </span>
              <div className="dw-wait__bays">
                <span className="dw-wait__bay is-busy">
                  <i>#1</i>
                  <b>занят</b>
                </span>
                <span className="dw-wait__bay is-busy">
                  <i>#2</i>
                  <b>занят</b>
                </span>
                <span className="dw-wait__bay is-soon">
                  <i>#3</i>
                  <b>скоро</b>
                </span>
              </div>
            </div>
          </div>
        ) : null}

        {variant === "mist" ? (
          <div className="dw-prep__stage">
            <WaitingCopy
              title="Вы в очереди"
              hint="Как освободится место — мы вас пригласим."
            />
            <div className="dw-wait__mist" aria-hidden>
              <span className="dw-wait__mist-glow" />
              <span className="dw-wait__mist-mark" style={LOGO_MASK} />
              <span className="dw-wait__mist-haze dw-wait__mist-haze--1" />
              <span className="dw-wait__mist-haze dw-wait__mist-haze--2" />
              <span className="dw-wait__drop-soft dw-wait__drop-soft--1" />
              <span className="dw-wait__drop-soft dw-wait__drop-soft--2" />
              <span className="dw-wait__drop-soft dw-wait__drop-soft--3" />
              <span className="dw-wait__drop-soft dw-wait__drop-soft--4" />
              <span className="dw-wait__drop-soft dw-wait__drop-soft--5" />
              <span className="dw-wait__bubble-soft dw-wait__bubble-soft--1" />
              <span className="dw-wait__bubble-soft dw-wait__bubble-soft--2" />
              <span className="dw-wait__bubble-soft dw-wait__bubble-soft--3" />
            </div>
          </div>
        ) : null}

        {variant === "wave" ? (
          <div className="dw-prep__stage">
            <WaitingCopy
              title="Вы в очереди"
              hint="Как освободится место — мы вас пригласим."
            />
            <div className="dw-wait__wave" aria-hidden>
              <span className="dw-wait__wave-mark" style={LOGO_MASK} />
              <span className="dw-wait__wave-fill">
                <span className="dw-wait__wave-line dw-wait__wave-line--1" />
                <span className="dw-wait__wave-line dw-wait__wave-line--2" />
                <span className="dw-wait__wave-line dw-wait__wave-line--3" />
              </span>
              <span className="dw-wait__wave-foam" />
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}

/** 2. Позвали / invite в бокс */
export function WashCaseCalled() {
  return (
    <div className="dw-case dw-case--called">
      <section className="dw-card dw-shell">
        <ShellHead plate="123 ABC 01" />
        <div className="dw-prep__stage">
          <div className="dw-prep__copy">
            <p className="dw-prep__title">Вас ждут</p>
            <p className="dw-prep__hint">Заезжайте в бокс #3 — мойка начнётся автоматически.</p>
          </div>
          <p className="dw-prep__bay">#3</p>
        </div>
      </section>
    </div>
  );
}

/** 3. Мойка идёт — варианты визуала на выбор */
const WASHING_VARIANTS = [
  { id: "logo", label: "Лого" },
  { id: "foam", label: "Шланг + пена" },
  { id: "upgrade3", label: "Аппарат" },
  { id: "bay", label: "Бокс" },
  { id: "logo_bay", label: "Лого + бокс" },
  { id: "car", label: "Машина" },
] as const;

type WashingVariantId = (typeof WASHING_VARIANTS)[number]["id"];

const WASHING_ROWS = [
  { label: "Мойка", value: "HiPoint Test" },
  { label: "Ваша машина", value: "123 ABC 01" },
  { label: "Тариф", value: "Стандарт" },
  { label: "Стоимость", value: "1 500 ₸" },
  { label: "Бокс", value: "№3" },
  { label: "Длительность", value: "4 мин 12 с" },
];

export function WashCaseWashing() {
  const [variant, setVariant] = useState<WashingVariantId>("upgrade3");

  return (
    <div className="dw-case dw-case--washing">
      <div className="dw-variant-switch" role="tablist" aria-label="Вариант экрана мойки">
        {WASHING_VARIANTS.map((item) => {
          const on = variant === item.id;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={on}
              className={on ? "dw-variant-switch__btn is-on" : "dw-variant-switch__btn"}
              onClick={() => setVariant(item.id)}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      {variant === "logo" ? (
        <section className="dw-card dw-shell">
          <ShellHead plate="123 ABC 01" />
          <div className="dw-shell__body">
            <ServiceFillProgress percent={0} variant="wash" showPercent={false} indeterminate />
            <p className="dw-status">Машина моется</p>
          </div>
        </section>
      ) : null}

      {variant === "foam" ? (
        <section className="dw-card dw-shell">
          <ShellHead plate="123 ABC 01" />
          <div className="dw-shell__body">
            <div className="dw-logo-wash" aria-hidden>
              <div className="dw-logo-wash__baychip">Бокс #3</div>

              <div className="dw-logo-wash__stage">
                <div className="dw-logo-wash__mark">
                  <span className="dw-logo-wash__shape dw-logo-wash__shape--base" style={LOGO_MASK} />
                  <span className="dw-logo-wash__shape dw-logo-wash__shape--wet" style={LOGO_MASK} />
                  <span className="dw-logo-wash__shape dw-logo-wash__shape--foam" style={LOGO_MASK} />
                  <span className="dw-logo-wash__shape dw-logo-wash__shape--shine" style={LOGO_MASK} />
                </div>

                <span className="dw-logo-wash__mist" />

                <span className="dw-logo-wash__hose">
                  <span className="dw-logo-wash__hose-line" />
                  <span className="dw-logo-wash__hose-grip" />
                  <span className="dw-logo-wash__hose-nozzle" />
                  <span className="dw-logo-wash__cone" />
                </span>

                <span className="dw-logo-wash__splash dw-logo-wash__splash--1" />
                <span className="dw-logo-wash__splash dw-logo-wash__splash--2" />
                <span className="dw-logo-wash__splash dw-logo-wash__splash--3" />

                <span className="dw-logo-wash__bubble dw-logo-wash__bubble--1" />
                <span className="dw-logo-wash__bubble dw-logo-wash__bubble--2" />
                <span className="dw-logo-wash__bubble dw-logo-wash__bubble--3" />
                <span className="dw-logo-wash__bubble dw-logo-wash__bubble--4" />
                <span className="dw-logo-wash__bubble dw-logo-wash__bubble--5" />
                <span className="dw-logo-wash__bubble dw-logo-wash__bubble--6" />

                <span className="dw-logo-wash__drop dw-logo-wash__drop--1" />
                <span className="dw-logo-wash__drop dw-logo-wash__drop--2" />
                <span className="dw-logo-wash__drop dw-logo-wash__drop--3" />
                <span className="dw-logo-wash__drop dw-logo-wash__drop--4" />
              </div>
            </div>
            <p className="dw-status">Машина моется · лого под струёй</p>
          </div>
        </section>
      ) : null}

      {variant === "upgrade3" ? (
        <section className="dw-card dw-shell">
          <ShellHead plate="123 ABC 01" />
          <div className="dw-shell__body">
            <div className="dw-auto-wash" aria-hidden>
              <div className="dw-auto-wash__baychip">Бокс #3 · авто</div>

              <div className="dw-auto-wash__tunnel">
                <span className="dw-auto-wash__rail dw-auto-wash__rail--top" />
                <span className="dw-auto-wash__rail dw-auto-wash__rail--bot" />

                <div className="dw-auto-wash__gantry">
                  <span className="dw-auto-wash__gantry-bar" />
                  <span className="dw-auto-wash__gantry-arm dw-auto-wash__gantry-arm--l" />
                  <span className="dw-auto-wash__gantry-arm dw-auto-wash__gantry-arm--r" />
                  <span className="dw-auto-wash__nozzles">
                    <i /><i /><i /><i /><i />
                  </span>
                  <span className="dw-auto-wash__curtain" />
                </div>

                <div className="dw-auto-wash__mark">
                  <span className="dw-auto-wash__shape dw-auto-wash__shape--base" style={LOGO_MASK} />
                  <span className="dw-auto-wash__shape dw-auto-wash__shape--prewash" style={LOGO_MASK} />
                  <span className="dw-auto-wash__shape dw-auto-wash__shape--foam" style={LOGO_MASK} />
                  <span className="dw-auto-wash__shape dw-auto-wash__shape--foam-deep" style={LOGO_MASK} />
                  <span className="dw-auto-wash__shape dw-auto-wash__shape--wet-sheen" style={LOGO_MASK} />
                  <span className="dw-auto-wash__shape dw-auto-wash__shape--rinse" style={LOGO_MASK} />
                  <span className="dw-auto-wash__shape dw-auto-wash__shape--dry" style={LOGO_MASK} />
                </div>

                <span className="dw-auto-wash__foam-sheet" />
                <span className="dw-auto-wash__foam-sheet dw-auto-wash__foam-sheet--thick" />

                <span className="dw-auto-wash__foam-blob dw-auto-wash__foam-blob--1" />
                <span className="dw-auto-wash__foam-blob dw-auto-wash__foam-blob--2" />
                <span className="dw-auto-wash__foam-blob dw-auto-wash__foam-blob--3" />
                <span className="dw-auto-wash__foam-blob dw-auto-wash__foam-blob--4" />
                <span className="dw-auto-wash__foam-blob dw-auto-wash__foam-blob--5" />

                <span className="dw-auto-wash__foam-cloud dw-auto-wash__foam-cloud--1" />
                <span className="dw-auto-wash__foam-cloud dw-auto-wash__foam-cloud--2" />
                <span className="dw-auto-wash__foam-cloud dw-auto-wash__foam-cloud--3" />
                <span className="dw-auto-wash__foam-cloud dw-auto-wash__foam-cloud--4" />
                <span className="dw-auto-wash__foam-cloud dw-auto-wash__foam-cloud--5" />
                <span className="dw-auto-wash__foam-cloud dw-auto-wash__foam-cloud--6" />
                <span className="dw-auto-wash__foam-cloud dw-auto-wash__foam-cloud--7" />
                <span className="dw-auto-wash__foam-cloud dw-auto-wash__foam-cloud--8" />
                <span className="dw-auto-wash__foam-cloud dw-auto-wash__foam-cloud--9" />

                <span className="dw-auto-wash__foam-drip dw-auto-wash__foam-drip--1" />
                <span className="dw-auto-wash__foam-drip dw-auto-wash__foam-drip--2" />
                <span className="dw-auto-wash__foam-drip dw-auto-wash__foam-drip--3" />
                <span className="dw-auto-wash__foam-drip dw-auto-wash__foam-drip--4" />
                <span className="dw-auto-wash__foam-drip dw-auto-wash__foam-drip--5" />
                <span className="dw-auto-wash__foam-drip dw-auto-wash__foam-drip--6" />
                <span className="dw-auto-wash__foam-drip dw-auto-wash__foam-drip--7" />

                <span className="dw-auto-wash__steam" />
                <span className="dw-auto-wash__dry-mist" />
                <span className="dw-auto-wash__air dw-auto-wash__air--1" />
                <span className="dw-auto-wash__air dw-auto-wash__air--2" />
                <span className="dw-auto-wash__air dw-auto-wash__air--3" />
                <span className="dw-auto-wash__air dw-auto-wash__air--4" />
                <span className="dw-auto-wash__air dw-auto-wash__air--5" />

                <span className="dw-auto-wash__bead dw-auto-wash__bead--1" />
                <span className="dw-auto-wash__bead dw-auto-wash__bead--2" />
                <span className="dw-auto-wash__bead dw-auto-wash__bead--3" />
                <span className="dw-auto-wash__bead dw-auto-wash__bead--4" />
                <span className="dw-auto-wash__bead dw-auto-wash__bead--5" />
                <span className="dw-auto-wash__bead dw-auto-wash__bead--6" />
                <span className="dw-auto-wash__bead dw-auto-wash__bead--7" />
                <span className="dw-auto-wash__bead dw-auto-wash__bead--8" />
                <span className="dw-auto-wash__bead dw-auto-wash__bead--9" />
                <span className="dw-auto-wash__bead dw-auto-wash__bead--10" />

                <span className="dw-auto-wash__streak dw-auto-wash__streak--1" />
                <span className="dw-auto-wash__streak dw-auto-wash__streak--2" />
                <span className="dw-auto-wash__streak dw-auto-wash__streak--3" />
                <span className="dw-auto-wash__streak dw-auto-wash__streak--4" />

                <span className="dw-auto-wash__water dw-auto-wash__water--1" />
                <span className="dw-auto-wash__water dw-auto-wash__water--2" />
                <span className="dw-auto-wash__water dw-auto-wash__water--3" />
                <span className="dw-auto-wash__water dw-auto-wash__water--4" />
                <span className="dw-auto-wash__water dw-auto-wash__water--5" />
                <span className="dw-auto-wash__water dw-auto-wash__water--6" />
                <span className="dw-auto-wash__water dw-auto-wash__water--7" />
                <span className="dw-auto-wash__water dw-auto-wash__water--8" />

                <span className="dw-auto-wash__drop dw-auto-wash__drop--1" />
                <span className="dw-auto-wash__drop dw-auto-wash__drop--2" />
                <span className="dw-auto-wash__drop dw-auto-wash__drop--3" />
                <span className="dw-auto-wash__drop dw-auto-wash__drop--4" />
                <span className="dw-auto-wash__drop dw-auto-wash__drop--5" />

                <span className="dw-auto-wash__bubble dw-auto-wash__bubble--1" />
                <span className="dw-auto-wash__bubble dw-auto-wash__bubble--2" />
                <span className="dw-auto-wash__bubble dw-auto-wash__bubble--3" />
                <span className="dw-auto-wash__bubble dw-auto-wash__bubble--4" />
                <span className="dw-auto-wash__bubble dw-auto-wash__bubble--5" />
                <span className="dw-auto-wash__bubble dw-auto-wash__bubble--6" />
              </div>
            </div>
            <p className="dw-status">Аппарат моет сам · потом сушит</p>
          </div>
        </section>
      ) : null}

      {variant === "bay" ? (
        <section className="dw-card dw-shell">
          <ShellHead plate="123 ABC 01" />
          <div className="dw-prep__stage">
            <div className="dw-prep__copy">
              <p className="dw-prep__title">Машина моется</p>
              <p className="dw-prep__hint">Бокс №3 · не выезжайте до сигнала</p>
            </div>
            <p className="dw-prep__bay dw-prep__bay--wash">#3</p>
          </div>
        </section>
      ) : null}

      {variant === "logo_bay" ? (
        <section className="dw-card dw-shell">
          <ShellHead plate="123 ABC 01" />
          <div className="dw-shell__body">
            <div className="dw-wash-combo">
              <ServiceFillProgress percent={0} variant="wash" showPercent={false} indeterminate />
              <div className="dw-wash-combo__bay" aria-label="Бокс 3">
                <span className="dw-wash-combo__bay-label">Бокс</span>
                <span className="dw-wash-combo__bay-num">#3</span>
              </div>
            </div>
            <p className="dw-status">Машина моется</p>
          </div>
        </section>
      ) : null}

      {variant === "car" ? (
        <section className="dw-card dw-shell">
          <ShellHead />
          <div className="dw-car-wash">
            <div className="dw-car-wash__scene" aria-hidden>
              <span className="dw-car-wash__drop dw-car-wash__drop--1" />
              <span className="dw-car-wash__drop dw-car-wash__drop--2" />
              <span className="dw-car-wash__drop dw-car-wash__drop--3" />
              <span className="dw-car-wash__drop dw-car-wash__drop--4" />
              <div className="dw-car-wash__car">
                <svg viewBox="0 0 120 48" fill="none" aria-hidden>
                  <path
                    d="M18 34h84c2 0 4 2 4 4v2H14v-2c0-2 2-4 4-4Z"
                    fill="currentColor"
                    opacity="0.15"
                  />
                  <path
                    d="M28 30c2-10 10-16 22-16h20c12 0 20 6 22 16H28Z"
                    fill="currentColor"
                    opacity="0.22"
                  />
                  <path
                    d="M22 30h76l-4 6H26l-4-6Z"
                    fill="currentColor"
                    opacity="0.55"
                  />
                  <circle cx="34" cy="36" r="5.5" fill="currentColor" opacity="0.75" />
                  <circle cx="86" cy="36" r="5.5" fill="currentColor" opacity="0.75" />
                  <circle cx="34" cy="36" r="2.2" fill="var(--app-block, #fff)" />
                  <circle cx="86" cy="36" r="2.2" fill="var(--app-block, #fff)" />
                </svg>
              </div>
              <span className="dw-car-wash__spray" />
            </div>
            <p className="dw-plate dw-car-wash__plate">123 ABC 01</p>
            <p className="dw-status">Машина моется · бокс №3</p>
          </div>
        </section>
      ) : null}

      <section className="dw-card dw-params">
        <div className="dw-params__inner">
          <p className="dw-params__title">Параметры мойки</p>
          {WASHING_ROWS.map((row) => (
            <div key={row.label} className="dw-params__row">
              <p className="dw-params__label">{row.label}</p>
              <p className="dw-params__value">{row.value}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

/** 4. Мойка завершена */
export function WashCaseDone() {
  return (
    <div className="dw-case dw-case--done">
      <div className="dw-done">
        <div className="dw-done__badge" aria-hidden>
          <OkIcon />
        </div>
        <h1 className="dw-done__title">Мойка завершена</h1>
        <p className="dw-plate dw-done__plate">123 ABC 01</p>
        <p className="dw-done__text">Оплата прошла успешно</p>
        <div className="dw-done__footer">
          <button type="button" className="dw-done__btn">
            Готово
          </button>
        </div>
      </div>
    </div>
  );
}

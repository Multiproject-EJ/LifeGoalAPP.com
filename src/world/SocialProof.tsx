import React, { useEffect, useRef, useState } from 'react';

interface StatItem {
  id: string;
  emoji: string;
  target: number;
  suffix: string;
  label: string;
}

interface TestimonialItem {
  id: string;
  avatar: string;
  quote: string;
  name: string;
  level: number;
}

const STATS: StatItem[] = [
  { id: 'players',  emoji: '🎮', target: 10,  suffix: 'K+', label: 'Players'       },
  { id: 'habits',   emoji: '🔥', target: 50,  suffix: 'K+', label: 'Habits tracked' },
  { id: 'rating',   emoji: '⭐', target: 4.9, suffix: '',   label: 'Rating'         },
];

const TESTIMONIALS: TestimonialItem[] = [
  { id: 'alex',   avatar: '🧑‍💻', quote: 'Finally a habit app that feels like a game.', name: 'Alex',   level: 12 },
  { id: 'sam',    avatar: '🎯', quote: "I've never stuck with habits this long before.", name: 'Sam',    level: 8  },
  { id: 'jordan', avatar: '💪', quote: 'The streaks and rewards keep me coming back.',   name: 'Jordan', level: 15 },
];

function useCountUp(target: number, active: boolean): number {
  const [value, setValue] = useState(0);
  const frameRef = useRef<number | null>(null);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    if (!active) return;

    // Detect reduced-motion preference and skip animation
    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReduced) {
      setValue(target);
      return;
    }

    const duration = 1200; // ms

    const animate = (timestamp: number) => {
      if (startRef.current === null) startRef.current = timestamp;
      const elapsed = timestamp - startRef.current;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(parseFloat((eased * target).toFixed(target < 10 ? 1 : 0)));
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      } else {
        setValue(target);
      }
    };

    frameRef.current = requestAnimationFrame(animate);

    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      startRef.current = null;
    };
  }, [active, target]);

  return value;
}

function StatCounter({ stat, active }: { stat: StatItem; active: boolean }) {
  const value = useCountUp(stat.target, active);
  const displayValue =
    stat.target < 10
      ? value.toFixed(1)
      : Math.round(value).toString();

  return (
    <li className="social-proof__stat" key={stat.id}>
      <span className="social-proof__stat-emoji" aria-hidden="true">{stat.emoji}</span>
      <span className="social-proof__stat-number" aria-label={`${displayValue}${stat.suffix} ${stat.label}`}>
        <span aria-hidden="true">{displayValue}{stat.suffix}</span>
      </span>
      <span className="social-proof__stat-label" aria-hidden="true">{stat.label}</span>
    </li>
  );
}

export function SocialProof() {
  const sectionRef = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;

    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.2 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="social-proof"
      aria-labelledby="social-proof-heading"
    >
      <div className="social-proof__header">
        <p className="social-proof__eyebrow" aria-hidden="true">COMMUNITY</p>
        <h2 className="social-proof__title" id="social-proof-heading">
          Join the movement
        </h2>
      </div>

      {/* Stats bar */}
      <ul className="social-proof__stats" aria-label="Community statistics">
        {STATS.map((stat) => (
          <StatCounter key={stat.id} stat={stat} active={visible} />
        ))}
      </ul>

      {/* Testimonial carousel */}
      <ul
        className="social-proof__testimonials"
        aria-label="Player testimonials"
      >
        {TESTIMONIALS.map((t) => (
          <li key={t.id} className="social-proof__card">
            <span className="social-proof__card-avatar" aria-hidden="true">{t.avatar}</span>
            <blockquote className="social-proof__card-quote">
              <p className="social-proof__card-text">"{t.quote}"</p>
              <footer className="social-proof__card-footer">
                <cite className="social-proof__card-name">{t.name}</cite>
                <span className="social-proof__card-level" aria-label={`Level ${t.level}`}>
                  Lv.{t.level}
                </span>
              </footer>
            </blockquote>
          </li>
        ))}
      </ul>
    </section>
  );
}

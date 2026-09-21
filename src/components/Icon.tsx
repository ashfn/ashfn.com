import type { CSSProperties } from 'react';
import { iconNames, type IconName } from '../lib/icons';

// A PNG alpha mask keeps currentColor/theme support when Tor disables SVG.
export default function Icon({ name, size = 16, className = '', style }: {
  name: IconName; size?: number; className?: string; style?: CSSProperties;
}) {
  return <span aria-hidden="true" data-icon={name} className={`site-icon ${className}`}
    style={{ width: size, height: size, maskSize: `${iconNames.length * 100}% 100%`,
      maskPosition: `${iconNames.indexOf(name) / (iconNames.length - 1) * 100}% 0`, ...style }} />;
}

import React from 'react';
import type { TextBlockProps } from './types.js';
export type { TextBlockProps };

export const TextBlock: React.FC<TextBlockProps> = ({
  tag: Tag = 'p',
  text = 'Text block',
  className = '',
  children,
  'data-id': dataId,
  auraId,
}) => {
  return (
    <Tag data-id={dataId} data-aura-id={auraId} className={className || undefined}>
      {children ?? text}
    </Tag>
  );
};

TextBlock.displayName = 'TextBlock';

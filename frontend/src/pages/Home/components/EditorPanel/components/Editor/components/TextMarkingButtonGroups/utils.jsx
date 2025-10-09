import {
  BoldIcon,
  ItalicIcon,
  UnderlineIcon,
  NumberedListIcon,
  BulletedListIcon,
  LeftAlignIcon,
  CenterAlignIcon,
  RightAlignIcon,
  JustifyAlignIcon
} from 'assets/icons/bubleMenuIcons';

export const getFormattingTextItems = (editor) => [
  {
    icon: (isActive) => <BoldIcon isActive={isActive} />,
    key: 'bold',
    label: 'Bold',
    handleClick: () => editor.chain().focus().toggleBold().run()
  },
  {
    icon: (isActive) => <ItalicIcon isActive={isActive} />,
    key: 'italic',
    label: 'Italic',
    handleClick: () => editor.chain().focus().toggleItalic().run()
  },
  {
    icon: (isActive) => <UnderlineIcon isActive={isActive} />,
    key: 'underline',
    label: 'Underline',
    handleClick: () => editor.chain().focus().toggleUnderline().run()
  }
];

export const numberedListTextItems = (editor) => [
  {
    icon: (isActive) => <NumberedListIcon isActive={isActive} />,
    key: 'orderedList',
    label: 'Numbered List',
    handleClick: () => editor.chain().focus().toggleOrderedList().run()
  },
  {
    icon: (isActive) => <BulletedListIcon isActive={isActive} />,
    key: 'bulletList',
    label: 'Bullet List',
    handleClick: () => editor.chain().focus().toggleBulletList().run()
  }
];

export const alignmentTextItems = (editor) => [
  {
    icon: (isActive) => <LeftAlignIcon isActive={isActive} />,
    key: 'left',
    activeState: { textAlign: 'left' },
    label: 'Left',
    handleClick: () => editor.chain().focus().setTextAlign('left').run()
  },
  {
    icon: (isActive) => <CenterAlignIcon isActive={isActive} />,
    key: 'center',
    activeState: { textAlign: 'center' },
    label: 'Center',
    handleClick: () => editor.chain().focus().setTextAlign('center').run()
  },
  {
    icon: (isActive) => <RightAlignIcon isActive={isActive} />,
    key: 'right',
    activeState: { textAlign: 'right' },
    label: 'Right',
    handleClick: () => editor.chain().focus().setTextAlign('right').run()
  },
  {
    icon: (isActive) => <JustifyAlignIcon isActive={isActive} />,
    key: 'justify',
    activeState: { textAlign: 'justify' },
    label: 'Justify',
    handleClick: () => editor.chain().focus().setTextAlign('justify').run()
  }
];

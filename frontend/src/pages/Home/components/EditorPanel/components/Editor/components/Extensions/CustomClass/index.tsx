import { Extension } from '@tiptap/core';
import '@tiptap/extension-text-style';

const CustomClass = Extension.create({
  name: 'className',

  addOptions() {
    return {
      types: ['textStyle']
    };
  }
});

export default CustomClass;

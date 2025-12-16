import StarterKit from '@tiptap/starter-kit';
import TextStyle from '@tiptap/extension-text-style';
import TableHeader from '@tiptap/extension-table-header';
import TableRow from '@tiptap/extension-table-row';
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';
import ListItem from '@tiptap/extension-list-item';
import { Color } from '@tiptap/extension-color';
import CustomLink from '../components/CustomLink';
import CustomParagraph from '../components/CustomParagraph';
import CustomHeading from '../components/CustomHeading';
import CustomHighlight from '../components/CustomHighlight';
import CustomTableCell from '../components/CustomTable/CustomTableCell';
import CustomTable from '../components/CustomTable';
import CustomBlockquote from '../components/CustomBlockquote';
import CustomBulletList from '../components/CustomBulletList';
import CustomOrderedList from '../components/CustomOrderedList';
import ReactComponent from '../components/Extensions/ReactComponent';
import Indent from '../components/Extensions/Indent';
import CustomClass from '../components/Extensions/CustomClass';
import CustomSpan from '../components/CustomSpan';

export const getEditorExtensions = () => [
  StarterKit.configure({
    paragraph: false,
    heading: false,
    bulletList: false,
    orderedList: false,
    blockquote: false
  }),
  Underline,
  Color.configure({ types: [TextStyle.name, ListItem.name] }),
  TextAlign.configure({
    types: ['paragraph', 'reactComponent'],
    defaultAlignment: 'justify'
  }),
  Indent.configure({
    types: ['listItem', 'paragraph'],
    minLevel: 0,
    maxLevel: 8
  }),
  CustomLink().configure({
    openOnClick: false,
    linkOnPaste: true
  }),
  CustomParagraph(),
  CustomClass,
  CustomSpan,
  CustomHeading,
  CustomBulletList,
  CustomOrderedList,
  CustomBlockquote,
  CustomHighlight.configure({
    HTMLAttributes: {
      class: 'selectedText',
      updateSectionStatus: false
    }
  }),
  CustomTable,
  TableRow,
  TableHeader,
  CustomTableCell,
  ReactComponent
];

import React, { memo } from 'react';
import { NodeViewContent, NodeViewWrapper } from '@tiptap/react';
import Diagram from './components/Diagram';
import SectionTitle from './components/SectionTitle';
import Feedback from './components/Feedback';

const componentsMap = {
  SectionTitle: SectionTitle,
  Diagram: Diagram,
  Feedback: Feedback
};

const getComponent = (componentType) => {
  return componentsMap[componentType] || NodeViewContent;
};

const CustomReactComponent = (props) => {
  const {
    node: { attrs: { componentType = '' } = {} }
  } = props;

  const Component = getComponent(componentType);

  return (
    <NodeViewWrapper
      {...(componentType !== 'SectionTitle' && {
        contentEditable: false,
        suppressContentEditableWarning: true
      })}
    >
      <Component {...(componentType ? props : {})} />
    </NodeViewWrapper>
  );
};

export default memo(CustomReactComponent);

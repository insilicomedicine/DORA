import React from 'react';
import Feedback from '../../../Feedback';

export default (props) => {
  const {
    node: { attrs }
  } = props;

  return (
    <div
      style={{
        marginTop: -16,
        padding: '16px 24px',
        margin: '0 -24px'
      }}
      className="feedbackWrapper"
      data-parent={attrs.id}
    >
      {!attrs.isHidden && <Feedback setcionId={attrs.id} />}
    </div>
  );
};

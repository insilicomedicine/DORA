import { useEffect, useState, memo, useMemo } from 'react';
import { Bibliography, ReferenceSourceType } from 'types/document';
import { removeDuplicates } from 'utils/utils';
import { useEditorStore } from 'contexts/editorStore';
import { useDocumentStore } from 'contexts/documentsStore';
import TextEvidenceItem from './TextEvidenceItem';

interface TextEvidenceProps {
  isReset?: boolean;
  showWithLink?: boolean;
  resourceType?: ReferenceSourceType;
  handleAction?: (target: Bibliography[]) => void;
  setIsReset?: (isReset: boolean) => void;
}

const TextEvidences = ({
  isReset = false,
  showWithLink = false,
  resourceType = 'pubmed',
  handleAction = () => {},
  setIsReset = () => {}
}: TextEvidenceProps) => {
  const { referenceLinkTarget, textEvidences } = useEditorStore();
  const { bibliographyList = [] } = useDocumentStore();
  const [checkedList, setCheckedList] = useState<Bibliography[]>([]);
  const isPubmedOrPmc = ['pubmed', 'pmc'].includes(resourceType);

  const handleCheck = (reference: Bibliography) => {
    let references = [...checkedList];
    const target = references.find((item) => item.uid === reference.uid);
    if (target) {
      references = references.filter((item) => item.uid !== reference.uid);
    } else {
      references.push({
        ...reference,
        type: isPubmedOrPmc ? 'pubmed' : resourceType,
        isNew: true
      });
    }
    setCheckedList(references);
  };

  useEffect(() => {
    if (!isReset) return;
    setCheckedList([]);
    setIsReset(false);
  }, [isReset, setIsReset]);

  useEffect(() => {
    handleAction && handleAction(checkedList);
  }, [checkedList, handleAction]);

  const pmidString = useMemo(() => {
    const pmid = referenceLinkTarget?.pmid;
    return pmid === undefined || pmid === null ? '' : String(pmid);
  }, [referenceLinkTarget?.pmid]);

  const textEvidenceData = useMemo(() => {
    if (!pmidString) return [] as Bibliography[];

    const filtered = bibliographyList.filter((item) => {
      const itemIdString =
        item?.id === undefined || item?.id === null ? '' : String(item.id);
      const pubmedIdString =
        item?.metadata?.pubmed_id === undefined ||
        item?.metadata?.pubmed_id === null
          ? ''
          : String(item.metadata.pubmed_id);

      return itemIdString === pmidString || pubmedIdString === pmidString;
    });
    return (
      removeDuplicates(filtered, (item) => {
        const pubmedId =
          item?.metadata?.pubmed_id === undefined ||
          item?.metadata?.pubmed_id === null
            ? ''
            : String(item.metadata.pubmed_id);
        const id =
          item?.id === undefined || item?.id === null ? '' : String(item.id);
        // Prefer pubmed_id when present, otherwise fall back to id
        const key = pubmedId || id;
        // If neither exists, return null to treat item as unique
        return key || null;
      }) || []
    );
  }, [bibliographyList, pmidString]);

  if (showWithLink) {
    return (
      <div style={{ maxHeight: 'calc(100% - 40px)', overflowY: 'auto' }}>
        <TextEvidenceItem
          itemData={textEvidenceData[0]}
          showWithLink={showWithLink}
        />
      </div>
    );
  }

  return (
    <>
      {Object.keys(textEvidences || {}).map((key: string) => {
        return (textEvidences?.[key] || [])
          .filter((item) => !item.id)
          ?.map((item: Bibliography, index) => {
            return (
              <TextEvidenceItem
                key={index}
                itemData={{
                  ...item,
                  type: item.type || resourceType
                }}
                isHidden={resourceType !== key}
                showWithLink={showWithLink}
                checkedList={checkedList}
                handleCheck={handleCheck}
                enableCheckbox
              />
            );
          });
      })}
    </>
  );
};

export default memo(TextEvidences);

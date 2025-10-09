const templateIcons = {
  originalresearch: {
    icon: '🔬'
  },
  businessreport: {
    icon: '📈'
  },
  expertanalysis: {
    icon: '💡'
  },
  briefreport: {
    icon: '💬'
  },
  literaturereview: {
    icon: '📚'
  },
  dataonhumans: {
    icon: '🩺'
  },
  lifescienceresourceportfolio: {
    icon: '💼'
  },
  experimentalworkflowandeducation: {
    icon: '📐'
  }
};

const filterTemplatesByType = (templates: any[], selectedType: string) => {
  if (selectedType === 'All templates') return templates;

  return [...templates].filter((a) => {
    if (a.type === selectedType) return a;
  });
};

export { templateIcons, filterTemplatesByType };

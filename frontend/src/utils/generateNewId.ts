let lastId = 0;

export const generateNewId = (prefix = '') => {
  lastId++;
  return `${prefix}${lastId}`;
};

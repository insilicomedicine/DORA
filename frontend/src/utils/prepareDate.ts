export type DateDisplayMode =
  | 'withMonthName'
  | 'withSeconds'
  | 'withMinutesAndMonthName'
  | 'today';
type DateType = string | number | Date;

export const prepareDate = (date, mode: DateDisplayMode) => {
  const today = new Date();
  const monthNames = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec'
  ];
  const dateUTC = new Date(date);
  const yyyy = dateUTC.getFullYear();
  let mm: DateType = dateUTC.getMonth() + 1;
  let dd: DateType = dateUTC.getDate();
  let hours: DateType = dateUTC.getHours();
  let minutes: DateType = dateUTC.getMinutes();
  let seconds: DateType = dateUTC.getSeconds();

  if (dd < 10) dd = '0' + dd;
  if (mm < 10) mm = '0' + mm;
  if (hours < 10) hours = '0' + hours;
  if (minutes < 10) minutes = '0' + minutes;
  if (seconds < 10) seconds = '0' + seconds;

  const preparedDate = `${dd}.${mm}.${yyyy}`;
  const preparedDateWithMonthName = `${dd} ${monthNames[dateUTC.getMonth()]} ${yyyy}`;
  const preparedDateWithSeconds = `${preparedDateWithMonthName} ${hours}:${minutes}:${seconds}`;
  const preparedDateWithMinutesAndMonthName = `${preparedDateWithMonthName}, ${hours}:${minutes}`;
  const prepareDateToday =
    today.toDateString() == dateUTC.toDateString()
      ? 'Today'
      : preparedDateWithMonthName;

  switch (mode) {
    case 'withMonthName':
      return preparedDateWithMonthName;
    case 'withSeconds':
      return preparedDateWithSeconds;
    case 'withMinutesAndMonthName':
      return preparedDateWithMinutesAndMonthName;
    case 'today':
      return prepareDateToday;
    default:
      return preparedDate;
  }
};

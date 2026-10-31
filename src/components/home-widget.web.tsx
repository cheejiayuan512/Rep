/** Web has no home screen widget. The sync call still resolves. */
const widget = {
  updateSnapshot(_props: { heading: string; primary: string; secondary: string }) {
    return undefined;
  },
};

export default widget;

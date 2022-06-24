import { generateFile, getEmbeddedIndexHTML, PATH_TO_INDEX } from './core.js';

const cleanWindowData = async () => {
  const cleanHtml = await getEmbeddedIndexHTML(new Map());
  await generateFile(PATH_TO_INDEX, cleanHtml.toString());
};

cleanWindowData();

import { useEffect } from "react";

function PageTitle({ title }: { title: string }) {
  useEffect(() => {
    document.title = `${title} | Meu App`;
  }, [title]);

  return title;
}

export default PageTitle;

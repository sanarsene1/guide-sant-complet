import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "VétoCare – Santé animale" },
      { name: "description", content: "Fiches animaux, maladies, conseils et quiz vétérinaires." },
      { property: "og:title", content: "VétoCare – Santé animale" },
      { property: "og:description", content: "Fiches animaux, maladies, conseils et quiz vétérinaires." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

function Index() {
  useEffect(() => {
    window.location.replace("/site/index.html");
  }, []);
  return <p className="p-8 text-center text-muted-foreground">Chargement de VétoCare…</p>;
}

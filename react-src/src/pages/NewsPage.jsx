import { useEffect, useState } from "react";
import StandardPage from "../components/StandardPage";
import { api } from "../lib/api";
function NewsPage(){const [items,setItems]=useState([]);const [error,setError]=useState("");useEffect(()=>{api("/api/news/latest").then((p)=>setItems(p.items||[])).catch(()=>setError("News is temporarily unavailable."))},[]);return <StandardPage><section className="insight-panel"><p className="eyebrow">College Football Wire</p><h2>Latest News</h2>{error&&<p className="status-line warn">{error}</p>}<div className="news-preview">{items.map((item)=><article className="news-item" key={item.link}><span>{item.source}</span><h3><a href={item.link} target="_blank" rel="noopener noreferrer">{item.title}</a></h3><small>{item.published}</small></article>)}</div></section></StandardPage>}
export default NewsPage;

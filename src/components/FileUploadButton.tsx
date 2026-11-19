'use client'
import { useState, type ChangeEventHandler } from 'react'
import { UploadCloud, FileCheck2 } from 'lucide-react'
export default function FileUploadButton({ label, accept, required, disabled, onChange }: { label:string; accept:string; required?:boolean; disabled?:boolean; onChange:ChangeEventHandler<HTMLInputElement> }) {
 const [name,setName]=useState('')
 return <span className="mt-3 flex flex-wrap items-center gap-3"><span className={`relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700 focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-2 ${disabled?'opacity-50':'hover:bg-blue-100'}`}><UploadCloud size={19}/>{label}<input type="file" aria-label={label} accept={accept} required={required} disabled={disabled} onChange={event=>{setName(event.target.files?.[0]?.name??'');onChange(event)}} className="absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed" /></span><span aria-live="polite" className="flex min-w-0 items-center gap-1.5 break-all text-xs font-normal text-slate-600">{name&&<FileCheck2 size={16} className="shrink-0 text-green-600"/>}{name||'No file selected'}</span></span>
}

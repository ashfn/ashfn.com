import Icon from "./Icon";
import { mailHref } from "../lib/mail";

export default function ObfuscatedMail() {
  return (
    <a href={mailHref}
      data-mail="" aria-label="Send an email"
      className="group flex items-center gap-2 text-[var(--ashgreen)] hover:text-[#007AFF] transition-colors duration-200 cursor-pointer"
    >
      <Icon name="mail" size={15} className="transition-transform duration-200 group-hover:scale-110 group-hover:-rotate-6" />
      af [at] ashfn.com
    </a>
  );
}

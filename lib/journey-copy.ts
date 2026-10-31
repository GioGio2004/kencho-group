import type { Locale } from "@/i18n/routing";

export const JOURNEY_COPY: Record<Locale, {
  galleryPrelude: string;
  requestNote: string;
  requestSteps: readonly string[];
  requestLabel: string;
}> = {
  en: {
    galleryPrelude: "our work",
    requestNote: "A photo, a sketch or an idea is enough to get started. Tell us what you have in mind in a project request.",
    requestSteps: ["Tell us about your space", "Add photos or drawings", "Send your project request"],
    requestLabel: "Start with your idea",
  },
  ka: {
    galleryPrelude: "ჩვენი ნამუშევრები",
    requestNote: "დასაწყებად ფოტო, ესკიზი ან იდეაც საკმარისია. პროექტის მოთხოვნაში გაგვიზიარეთ, რას გეგმავთ.",
    requestSteps: ["მოგვიყევით თქვენი სივრცის შესახებ", "დაამატეთ ფოტოები ან ნახაზები", "გამოგზავნეთ პროექტის მოთხოვნა"],
    requestLabel: "დაიწყეთ თქვენი იდეით",
  },
  ru: {
    galleryPrelude: "наши работы",
    requestNote: "Для начала достаточно фотографии, эскиза или идеи. Расскажите о своих планах в заявке на проект.",
    requestSteps: ["Расскажите о вашем пространстве", "Добавьте фотографии или чертежи", "Отправьте заявку на проект"],
    requestLabel: "Начните с вашей идеи",
  },
};

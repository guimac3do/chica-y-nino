export const maskCPF = (value: string) => {
  const cleaned = value.replace(/\D/g, '').substring(0, 11); // Limita a 11 dígitos
  return cleaned
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
};

export const maskPhone = (value: string) => {
  const cleaned = value.replace(/\D/g, '').substring(0, 11); // Limita a 11 dígitos
  if (cleaned.length <= 10) {
    return cleaned
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4})(\d)/, '$1-$2');
  }
  return cleaned
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2');
};

export const unmaskValue = (value: string) => {
  return value.replace(/\D/g, '');
};

export const isValidCPFLength = (value: string) => {
  const unmasked = unmaskValue(value);
  return unmasked.length === 11; // Exige exatamente 11 dígitos
};

export const isValidPhoneLength = (value: string) => {
  const unmasked = unmaskValue(value);
  return unmasked.length === 10 || unmasked.length === 11; // Aceita 10 ou 11 dígitos
};
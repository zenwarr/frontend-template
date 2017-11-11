import * as validate from 'validate.js';

export function initValidation(): void {
  let forms = document.querySelectorAll('form.js-validate');
  for (let q = 0; q < forms.length; ++q) {
    new FormValidator(forms[q] as HTMLFormElement);
  }
}

export class FormValidator {
  constructor(public form: HTMLFormElement) {
    form.addEventListener('submit', this.onSubmit.bind(this));

    let elems = this.form.querySelectorAll('[name]');
    for (let q = 0; q < elems.length; ++q) {
      let elem = elems[q];
      let elem_name = elem.getAttribute('name');
      if (!elem_name) {
        continue;
      }

      let constrain: { [name: string]: any } = {
        presence: elem.hasAttribute('required')
      };

      switch (elem.tagName.toLowerCase()) {
        case 'input': {
          switch ((elem.getAttribute('type') || 'text').toLowerCase()) {
            case 'email':
              constrain.email = true;
              break;

            case 'number':
              constrain.format = {

              };
              break;
          }
        } break;

        case 'select':
        case 'textarea':
          break;

        default:
          console.warn('Unsupported element tag: ', elem);
          break;
      }

      this.constraints[elem_name] = constrain;
    }
  }

  onSubmit(e: Event): void {
    if (!this.validate()) {
      e.preventDefault();
    }
  }

  validate(): boolean {
    throw new Error("Method not implemented");
  }

  setError(msg: string, elem: HTMLElement): void {
    throw new Error("Method not implemented");
  }

  protected constraints: { [name: string]: any } = { };
}

// import ValidationOptions = JQueryValidation.ValidationOptions;
// import * as $ from 'jquery';
// import 'jquery-validation/dist/jquery.validate.js';
//
// export function initValidation(): void {
//   $.validator.setDefaults({
//     ignore: ''
//   });
//
//   $.validator.addMethod('requiredphone', (value: string): boolean => {
//     return value.replace(/\D+/g, '').length > 1;
//   }, "Заполните это поле");
//
//   $.validator.addMethod("minlenghtphone", function (value: string): boolean {
//     return value.replace(/\D+/g, '').length > 10;
//   }, "Неверный формат номера");
//
//   let forms_to_validate = document.getElementsByClassName('js-validate');
//   for (let q = 0; q < forms_to_validate.length; ++q) {
//     $(forms_to_validate[q]).validate(buildValidationOptions());
//   }
// }
//
// function buildValidationOptions(inputOptions?: ValidationOptions): ValidationOptions {
//   inputOptions = inputOptions || {};
//
//   return $.extend({
//     onfocusout: false,
//     onsubmit: true,
//     rules: {
//       tel: {
//         requiredphone: true,
//         minlenghtphone: true
//       },
//       password: 'required',
//       password_repeat: {
//         equalTo: '[name=password]'
//       }
//     },
//     errorElement: 'span',
//     errorClass: 'ib__error',
//     errorPlacement: ($errorElement: JQuery, $target: JQuery): void => {
//       // $target is the input element on which error was triggered
//       // $errorElement is .input__error element which hold error message
//       $errorElement.attr('title', $errorElement.text());
//       $target.attr('title', $errorElement.text());
//
//       let $input = $target.closest('.input');
//       if ($input.length > 0 && ($input[0] as HTMLElement).hasAttribute('data-pin-error')) {
//         $errorElement.addClass('input__error');
//         $input.append($errorElement);
//       } else {
//         $target.closest('.ib').append($errorElement);
//       }
//     }, highlight: (element: HTMLElement, errorClass: string, validClass: string): void => {
//       $(element).closest('.input').addClass('input--error');
//       $(element).closest('.ib').addClass('ib--error');
//     }, unhighlight: (element: HTMLElement, errorClass: string, validClass: string): void => {
//       $(element).closest('.input').removeClass('input--error');
//       $(element).closest('.ib').removeClass('ib--error');
//       $(element).removeAttr('title');
//     },
//     invalidHandler: () => setTimeout(() => $('.js-select').trigger('refresh'), 1),
//     success: ($label: JQuery): void => {
//       $label.closest('.input').addClass('input--ok');
//       $label.closest('.ib').addClass('ib--ok');
//     }
//   }, inputOptions);
// }

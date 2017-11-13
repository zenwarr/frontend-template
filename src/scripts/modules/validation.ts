import * as validate from 'validate.js';
import './utils'; // for polyfills

export function initValidation(): void {
  let forms = document.querySelectorAll('form.js-validate');
  for (let q = 0; q < forms.length; ++q) {
    new FormValidator(forms[q] as HTMLFormElement);
  }

  (validate as any).options = {
    fullMessages: false
  };
}

type ValidationConstraints =  { [name: string]: any };

interface InputData {
  elem: Element;
  ib: Element|null;
  inputBlock: Element|null;
  errorElement: Element|null;
}

export class FormValidator {
  constructor(protected _form: HTMLFormElement) {
    this._form.addEventListener('submit', this.onSubmit.bind(this));
    this._form.setAttribute('novalidate', '');
  }

  onSubmit(e: Event): boolean {
    e.preventDefault();
    this.validate();
    return false;
  }

  validate(): boolean {
    let errors = validate(this._form, this.constraints);

    let hasErrors = errors != null;
    this.setFormHasErrors(hasErrors);
    this.showErrors(errors);
    this._beginLiveValidation();
    return hasErrors;
  }

  validateSingle(elemName: string): boolean {
    if (!this._constraints || !this._elems) {
      this._buildConstraints();
    }

    let elemData = this._elems ? this._elems[elemName] : null;
    if (!elemData) {
      console.warn(`element with name ${name} has not been found while validating a single element`);
      return true;
    }

    let constraint = this._constraints ? this._constraints[elemName] : null;

    let error: string|null = null;
    if (constraint) {
      error = validate.single(this._getInputValue(elemData.elem), constraint);
    }

    this.setFormHasErrors(error != null);

    if (error) {
      this.setError(error, elemData);
    } else {
      this.clearError(elemData);
    }

    return error != null;
  }

  showErrors(errors: any): void {
    if (!this._elems) {
      console.warn('Invalid showErrors call: no elements has been collected');
      return;
    }

    for (let elem_name of Object.keys(this._elems)) {
      if (errors[elem_name] != null) {
        this.setError(errors[elem_name], this._elems[elem_name]);
      } else {
        this.clearError(this._elems[elem_name]);
      }
    }
  }

  setError(msg: string, elem: InputData): void {
    // set titles
    elem.elem.setAttribute('title', msg);
    if (elem.errorElement) {
      let msgNode = document.createTextNode(msg);
      elem.errorElement.innerHTML = '';
      elem.errorElement.appendChild(msgNode);
      elem.errorElement.setAttribute('title', msg);
    }

    // set classes
    if (elem.ib) {
      elem.ib.classList.add('ib--error');
    }

    if (elem.inputBlock) {
      elem.inputBlock.classList.add('input--error');
    }
  }

  clearError(elem: InputData): void {
    // clear titles
    elem.elem.setAttribute('title', '');
    if (elem.errorElement) {
      elem.errorElement.innerHTML = '';
      elem.errorElement.setAttribute('title', '');
    }

    // clear error classes
    if (elem.ib) {
      elem.ib.classList.remove('ib--error');
    }

    if (elem.inputBlock) {
      elem.inputBlock.classList.remove('input--error');
    }
  }

  get constraints(): ValidationConstraints {
    if (!this._constraints) {
      this._buildConstraints();
    }
    return this._constraints as ValidationConstraints;
  }

  get form(): HTMLFormElement {
    return this._form;
  }

  /** Protected area **/

  protected _buildInputData(elem: Element): InputData {
    let ib = elem.closest('.ib');
    let inputBlock = elem.closest('.input');
    let errorElement: Element|null = (inputBlock && inputBlock.querySelector('.input__error'))
                                      || (ib && ib.querySelector('.ib__error'));
    if (!errorElement) {
      // construct new error element and add it to .ib (by default) or to .input (if .ib does not exist)
      errorElement = document.createElement('div');

      if (ib) {
        errorElement.classList.add('ib__error');
        ib.appendChild(errorElement);
      } else if (inputBlock) {
        errorElement.classList.add('input__error');
        inputBlock.appendChild(errorElement);
      }
    }

    return {
      elem: elem,
      ib,
      inputBlock,
      errorElement
    }
  }

  protected _getElementMsg(elem: Element, msgClass: string, def: string): string {
    return elem.getAttribute('data-msg-' + msgClass) || def;
  }

  protected _buildConstraints() {
    let elems = this.form.querySelectorAll('[name]');

    this._constraints = { };
    this._elems = { };
    for (let q = 0; q < elems.length; ++q) {
      let elem = elems[q];
      let elem_name = elem.getAttribute('name');
      if (!elem_name) {
        console.warn(`No name for element`, elem);
        continue;
      }

      this._elems[elem_name] = this._buildInputData(elem);

      let constrain: { [name: string]: any } = { };
      if (elem.hasAttribute('required')) {
        constrain.presence = {
          message: this._getElementMsg(elem, 'required', 'Укажите значение')
        }
      }

      if (elem.hasAttribute('minlength')) {
        let minlength = +(elem.getAttribute('minlength') as string);
        constrain.length = {
          minimum: minlength,
          message: this._getElementMsg(elem, 'minlength', `Укажите значение длиннее ${minlength} символов`)
        };
      }

      if (elem.hasAttribute('pattern')) {
        constrain.format = {
          pattern: elem.getAttribute('pattern') as string,
          message: this._getElementMsg(elem, 'pattern', 'Укажите значение в нужном формате')
        };
      }

      switch (elem.tagName.toLowerCase()) {
        case 'input': {
          switch ((elem.getAttribute('type') || 'text').toLowerCase()) {
            case 'email':
              constrain.email = {
                message: this._getElementMsg(elem, 'email', 'Укажите корректный e-mail')
              };
              break;

            case 'number': {
              constrain.numericality = { };

              let min: number|null = null, max: number|null = null;

              if (elem.hasAttribute('min')) {
                min = +(elem.getAttribute('min') as string);
                constrain.numericality.greaterThanOrEqualTo = min;
              }

              if (elem.hasAttribute('max')) {
                max = +(elem.getAttribute('max') as string);
                constrain.numericality.lessThanOrEqualTo = max;
              }

              let defMsg: string;
              if (min == null && max == null) {
                defMsg = `Введите число`;
              } else if (min != null && max != null) {
                defMsg = `Введите число в диапазоне от ${min} до ${max}`;
              } else if (min != null) {
                defMsg = `Введите число не меньше ${min}`;
              } else {
                defMsg = `Введите число не больше ${max}`;
              }

              constrain.numericality.message = this._getElementMsg(elem, 'number', defMsg);
            } break;
          }
        } break;

        case 'select':
        case 'textarea':
          break;

        default:
          console.warn('Unsupported element tag: ', elem);
          break;
      }

      this._constraints[elem_name] = constrain;
    }
  }

  protected _beginLiveValidation(): void {
    if (this._liveValidation) {
      return;
    }

    if (!this._elems) {
      this._buildConstraints();
    }

    for (let elemName of Object.keys(this._elems as any)) {
      let elemData = (this._elems as any)[elemName];
      elemData.elem.addEventListener('change', this.onElementChange.bind(this, elemName));
      elemData.elem.addEventListener('input', this.onElementChange.bind(this, elemName));
    }

    this._liveValidation = true;
  }

  protected onElementChange(elemName: string, e: Event): void {
    this.validateSingle(elemName);
  }

  protected setFormHasErrors(hasErrors: boolean) {
    this._form.classList.toggle('form--has-errors', hasErrors);
  }

  protected _getInputValue(elem: Element): string|null {
    let value = (elem as HTMLInputElement).value;
    return value == null || value === '' ? null : value;
  }

  protected _constraints: ValidationConstraints|null = null;
  protected _elems: { [name: string]: InputData }|null = null;
  protected _liveValidation: boolean = false;
}
